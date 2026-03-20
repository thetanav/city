"use client";

import { Badge } from "@/components/ui/badge";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { use, useState } from "react";
import { api } from "@/lib/eden";
import { notFound } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDown01, ArrowDown10, Hammer, MoreVertical, Search, X } from "lucide-react";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { Checkbox } from "@/components/ui/checkbox";
import { formatMinorMoney } from "@/lib/ticketing";
import { toastManager } from "@/components/ui/toast";

type TicketSortField = "purchased" | "qty" | "totalPrice" | "status" | "tier";
type TicketSortOrder = "asc" | "dsc";

function apiErrorMessage(value: unknown, fallback: string) {
  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof (value as { message?: unknown }).message === "string"
  ) {
    return (value as { message: string }).message;
  }

  return fallback;
}

function formatDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TicketTableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: 10 }).map((_, index) => (
              <TableHead key={index} className="py-3 pr-4 font-medium">
                <div className="h-4 w-16 rounded bg-muted/70 animate-pulse" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, rowIndex) => (
            <TableRow key={rowIndex} className="border-b last:border-0">
              {Array.from({ length: 10 }).map((_, colIndex) => (
                <TableCell key={colIndex} className="py-3 pr-4">
                  <div className="h-4 w-full max-w-28 rounded bg-muted/60 animate-pulse" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = use(params);
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState<{
    field: TicketSortField;
    order: TicketSortOrder;
  }>({
    field: "purchased",
    order: "dsc",
  });

  const toggleSort = (field: TicketSortField) => {
    setPage(0);
    setFilter((current) => {
      if (current.field === field) {
        return {
          field,
          order: current.order === "asc" ? "dsc" : "asc",
        };
      }

      return { field, order: "dsc" };
    });
  };

  const sortSuffix = (field: TicketSortField) => {
    if (filter.field !== field) return "";
    return filter.order === "asc" ? (
      <ArrowDown01 className="size-4" />
    ) : (
      <ArrowDown10 className="size-4" />
    );
  };

  const {
    data: tickets,
    isFetching,
    isPending,
  } = useQuery({
    queryKey: ["dashboard", slug, page, query, filter.field, filter.order],
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await api.events.tickets({ slug }).get({
        query: {
          query,
          offset: page * 10,
          limit: 10,
          filter,
        },
      });
      return data;
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, valid }: { id: string; valid: boolean }) => {
      const { data, error } = await api.tickets({ id }).put({ valid });

      if (error) {
        throw new Error(apiErrorMessage(error.value, "Failed to update ticket status"));
      }

      if (!data?.ok) {
        throw new Error(apiErrorMessage(data, "Failed to update ticket status"));
      }

      return { id, valid };
    },
    onSuccess: ({ valid }) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", slug] });
      toastManager.add({
        title: valid ? "Ticket enabled" : "Ticket invalidated",
        type: "success",
      });
    },
    onError: (error) => {
      toastManager.add({
        title: error instanceof Error ? error.message : "Failed to update ticket status",
        type: "error",
      });
    },
  });

  const bulkInvalidateMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(
        ids.map(async (id) => {
          const { data, error } = await api.tickets({ id }).put({ valid: false });

          if (error) {
            throw new Error(apiErrorMessage(error.value, "Failed to invalidate selected tickets"));
          }

          if (!data?.ok) {
            throw new Error(apiErrorMessage(data, "Failed to invalidate selected tickets"));
          }

          return id;
        }),
      );

      return results;
    },
    onSuccess: (ids) => {
      setSelected((current) => current.filter((id) => !ids.includes(id)));
      queryClient.invalidateQueries({ queryKey: ["dashboard", slug] });
      toastManager.add({
        title: `Invalidated ${ids.length} ticket${ids.length === 1 ? "" : "s"}`,
        type: "success",
      });
    },
    onError: (error) => {
      toastManager.add({
        title: error instanceof Error ? error.message : "Failed to invalidate selected tickets",
        type: "error",
      });
    },
  });

  if (tickets && !tickets.ok) return notFound();

  const soldCount = tickets?.totalCount ?? 0;
  const remainingCount = tickets?.totalRemaining ?? 0;
  const totalTickets = soldCount + remainingCount;
  const soldPercent = tickets?.soldPercentage ?? 0;
  const avgTicketPrice = tickets?.avgTicketPrice ?? 0;
  const invalidEntries = tickets?.invalidEntries ?? 0;
  const visibleTicketIds = tickets?.data?.map((ticket) => ticket.id) ?? [];
  const selectedVisibleCount = selected.filter((id) => visibleTicketIds.includes(id)).length;
  const allVisibleSelected =
    visibleTicketIds.length > 0 && selectedVisibleCount === visibleTicketIds.length;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{tickets?.title}</h1>
          <p className="text-sm text-muted-foreground">
            {tickets?.startDate
              ? `${new Date(tickets.startDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })} at ${tickets.location}`
              : "Loading event details..."}
          </p>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Sold:</span>{" "}
            <span className="font-medium">
              {soldCount}/{totalTickets}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Remaining:</span>{" "}
            <span className="font-medium">{remainingCount}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Avg price:</span>{" "}
            <span className="font-medium">{formatMinorMoney(avgTicketPrice)}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Sold:</span>{" "}
            <span className="font-medium">{soldPercent.toFixed(1)}%</span>
          </p>
          <p>
            <span className="text-muted-foreground">Invalid:</span>{" "}
            <span className="font-medium">{invalidEntries}</span>
          </p>
        </div>
      </section>

      <section className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground z-10" />
          <Input
            placeholder="Search events, venues, or vibes..."
            className="pl-8 py-2 pr-8"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
          />
          {query.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setPage(0);
              }}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </section>

      {isPending || (!tickets && isFetching) ? (
        <TicketTableSkeleton />
      ) : (
        <div>
          <section>
            {tickets?.data?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tickets sold yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-3 pr-0 font-medium">
                        <Checkbox
                          checked={
                            selectedVisibleCount === 0
                              ? false
                              : allVisibleSelected
                                ? true
                                : "indeterminate"
                          }
                          onCheckedChange={(value) => {
                            setSelected((current) => {
                              const otherIds = current.filter(
                                (id) => !visibleTicketIds.includes(id),
                              );

                              if (value === true) {
                                return [...otherIds, ...visibleTicketIds];
                              }

                              return otherIds;
                            });
                          }}
                          className="cursor-pointer"
                        />
                      </TableHead>
                      <TableHead className="py-3 pr-4 font-medium">Ticket</TableHead>
                      <TableHead className="py-3 pr-4 font-medium">Buyer</TableHead>
                      <TableHead className="py-3 pr-4 font-medium">
                        <button
                          type="button"
                          className="cursor-pointer hover:text-foreground/80 flex gap-1"
                          onClick={() => toggleSort("tier")}
                        >
                          Tier{sortSuffix("tier")}
                        </button>
                      </TableHead>
                      <TableHead className="py-3 pr-4 font-medium">
                        <button
                          type="button"
                          className="cursor-pointer hover:text-foreground/80 flex gap-1"
                          onClick={() => toggleSort("qty")}
                        >
                          Qty{sortSuffix("qty")}
                        </button>
                      </TableHead>
                      <TableHead className="py-3 pr-4 font-medium">Unit Price</TableHead>
                      <TableHead className="py-3 pr-4 font-medium">
                        <button
                          type="button"
                          className="cursor-pointer hover:text-foreground/80 flex gap-1"
                          onClick={() => toggleSort("totalPrice")}
                        >
                          Total{sortSuffix("totalPrice")}
                        </button>
                      </TableHead>
                      <TableHead className="py-3 pr-4 font-medium">
                        <button
                          type="button"
                          className="cursor-pointer hover:text-foreground/80 flex gap-1"
                          onClick={() => toggleSort("status")}
                        >
                          Status{sortSuffix("status")}
                        </button>
                      </TableHead>
                      <TableHead className="py-3 pr-0 font-medium">
                        <button
                          type="button"
                          className="cursor-pointer hover:text-foreground/80 flex gap-1"
                          onClick={() => toggleSort("purchased")}
                        >
                          Purchased{sortSuffix("purchased")}
                        </button>
                      </TableHead>
                      <TableHead className="py-3 pr-0">
                        <Menu>
                          <MenuTrigger
                            render={
                              <Button
                                variant="outline"
                                size="icon-sm"
                                disabled={
                                  selectedVisibleCount === 0 || bulkInvalidateMutation.isPending
                                }
                              >
                                <MoreVertical />
                              </Button>
                            }
                          />
                          <MenuPopup align="start" sideOffset={4}>
                            <MenuItem
                              onClick={() => {
                                if (selectedVisibleCount === 0) return;
                                const ids = selected.filter((id) => visibleTicketIds.includes(id));
                                void bulkInvalidateMutation.mutateAsync(ids);
                              }}
                            >
                              <Hammer />
                              Invalidate selected
                            </MenuItem>
                          </MenuPopup>
                        </Menu>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets?.data?.map((ticket) => {
                      const buyer = ticket.user?.name ?? ticket.user?.email ?? "Guest checkout";

                      return (
                        <TableRow key={ticket.id} className="border-b last:border-0">
                          <TableCell className="py-3 pr-2">
                            <Checkbox
                              checked={selected.includes(ticket.id)}
                              onCheckedChange={(value) => {
                                setSelected((prev) => {
                                  if (value === true) {
                                    if (prev.includes(ticket.id)) return prev;
                                    return [...prev, ticket.id];
                                  }

                                  return prev.filter((id) => id !== ticket.id);
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell className="py-3 pr-4 font-mono text-xs hover:underline cursor-pointer">
                            <Tooltip>
                              <TooltipTrigger
                                render={<p>{ticket.id.slice(0, 10)}...</p>}
                              ></TooltipTrigger>
                              <TooltipPopup>Copy</TooltipPopup>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="py-3 pr-4">{buyer}</TableCell>
                          <TableCell className="py-3 pr-4">{ticket.tierName}</TableCell>
                          <TableCell className="py-3 pr-4">{ticket.qty}</TableCell>
                          <TableCell className="py-3 pr-4">
                            {formatMinorMoney(ticket.unitPrice)}
                          </TableCell>
                          <TableCell className="py-3 pr-4">
                            {formatMinorMoney(ticket.qty * ticket.unitPrice)}
                          </TableCell>
                          <TableCell className="py-3 pr-4">
                            <Badge variant={ticket.valid ? "success" : "destructive"} size="sm">
                              {ticket.valid ? "Valid" : "Invalid"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 pr-0">
                            {formatDate(ticket.createdAt)}
                          </TableCell>
                          <TableCell className="py-3 pr-0">
                            <Menu>
                              <MenuTrigger
                                render={
                                  <Button
                                    variant="outline"
                                    size="icon-sm"
                                    disabled={updateTicketMutation.isPending}
                                  >
                                    <MoreVertical />
                                  </Button>
                                }
                              />
                              <MenuPopup align="start" sideOffset={4}>
                                <MenuItem
                                  onClick={() => {
                                    void updateTicketMutation.mutateAsync({
                                      id: ticket.id,
                                      valid: !ticket.valid,
                                    });
                                  }}
                                >
                                  <Hammer />
                                  {ticket.valid ? "Disable" : "Enable"}
                                </MenuItem>
                              </MenuPopup>
                            </Menu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
          <div className="h-fit w-full flex justify-between items-center my-2">
            <p className="text-sm text-muted-foreground">Total pages: {tickets?.totalPages}</p>
            <div>
              <Pagination className="w-fit">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      className={`${!tickets?.previousPage && "opacity-60 pointer-events-none"}`}
                      onClick={() => {
                        if (tickets?.previousPage) {
                          setPage(page - 1);
                        }
                      }}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink>{page + 1}</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      className={`${!tickets?.nextPage && "opacity-60 pointer-events-none"}`}
                      onClick={() => {
                        if (tickets?.nextPage) {
                          setPage(page + 1);
                        }
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
