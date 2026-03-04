"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
import {
  CreditCard,
  Hammer,
  Hash,
  MoreVertical,
  Search,
  X,
} from "lucide-react";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { Checkbox } from "@/components/ui/checkbox";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function formatDate(value: Date) {
  return value.toLocaleString(undefined, {
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

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);

  const {
    data: tickets,
    isFetching,
    isPending,
  } = useQuery({
    queryKey: ["dashboard", slug, page, query],
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await api.events.tickets({ slug }).get({
        query: {
          query,
          offset: page * 10,
          limit: 10,
        },
      });
      return data;
    },
  });

  if (tickets && !tickets.ok) return notFound();

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {tickets?.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date(tickets?.startDate).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}{" "}
            at {tickets?.location}
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Sold</CardDescription>
            <CardTitle>{tickets?.totalCount}</CardTitle>
          </CardHeader>
          <CardPanel className="pt-0 text-sm text-muted-foreground">
            of {tickets?.totalCount + tickets?.totalRemaining} tickets
          </CardPanel>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Profit</CardDescription>
            <CardTitle>{formatMoney(tickets?.grossRevenue!)}</CardTitle>
          </CardHeader>
          <CardPanel className="pt-0 text-sm text-muted-foreground">
            gross ticket revenue
          </CardPanel>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Remaining</CardDescription>
            <CardTitle>{tickets?.remaining}</CardTitle>
          </CardHeader>
          <CardPanel className="pt-0 text-sm text-muted-foreground">
            {tickets?.soldPercentage.toFixed(1)}% sold
          </CardPanel>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Average Ticket Price</CardDescription>
            <CardTitle>{formatMoney(tickets?.avgTicketPrice)}</CardTitle>
          </CardHeader>
          <CardPanel className="pt-0 text-sm text-muted-foreground">
            {tickets?.totalCount} records, {tickets?.invalidEntries} invalid
          </CardPanel>
        </Card>
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
              onClick={() => setQuery("")}
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
            {tickets?.totalCount.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tickets sold yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-3 pr-0 font-medium">
                        <Checkbox
                          checked={
                            selected.length > 0 ? "indeterminate" : false
                          }
                          onClick={() => {
                            setSelected([]);
                          }}
                          className="cursor-pointer"
                        />
                      </TableHead>
                      <TableHead className="py-3 pr-4 font-medium">
                        Ticket
                      </TableHead>
                      <TableHead className="py-3 pr-4 font-medium">
                        Buyer
                      </TableHead>
                      <TableHead className="py-3 pr-4 font-medium">
                        Tier
                      </TableHead>
                      <TableHead className="py-3 pr-4 font-medium">
                        Qty
                      </TableHead>
                      <TableHead className="py-3 pr-4 font-medium">
                        Unit Price
                      </TableHead>
                      <TableHead className="py-3 pr-4 font-medium">
                        Total
                      </TableHead>
                      <TableHead className="py-3 pr-4 font-medium">
                        Status
                      </TableHead>
                      <TableHead className="py-3 pr-0 font-medium">
                        Purchased
                      </TableHead>
                      <TableHead className="py-3 pr-0">
                        <Menu>
                          <MenuTrigger
                            render={
                              <Button
                                variant={"outline"}
                                size="icon-sm"
                                className={`${
                                  selected.length == 0 &&
                                  "opacity-60 pointer-events-none"
                                }`}
                              >
                                <MoreVertical />
                              </Button>
                            }
                          />
                          <MenuPopup align="start" sideOffset={4}>
                            <MenuItem>
                              <Hammer />
                              Invalid them all
                            </MenuItem>
                            <MenuItem>
                              <CreditCard />
                              Process Refund
                            </MenuItem>
                          </MenuPopup>
                        </Menu>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets?.data?.map((ticket) => {
                      const buyer =
                        ticket.user?.name ??
                        ticket.user?.email ??
                        "Guest checkout";

                      return (
                        <TableRow
                          key={ticket.id}
                          className="border-b last:border-0"
                        >
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
                          <TableCell className="py-3 pr-4">
                            {ticket.tierName}
                          </TableCell>
                          <TableCell className="py-3 pr-4">
                            {ticket.qty}
                          </TableCell>
                          <TableCell className="py-3 pr-4">
                            {formatMoney(ticket.unitPrice)}
                          </TableCell>
                          <TableCell className="py-3 pr-4">
                            {formatMoney(ticket.qty * ticket.unitPrice)}
                          </TableCell>
                          <TableCell className="py-3 pr-4">
                            <Badge
                              variant={ticket.valid ? "success" : "destructive"}
                              size="sm"
                            >
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
                                  <Button variant={"outline"} size="icon-sm">
                                    <MoreVertical />
                                  </Button>
                                }
                              />
                              <MenuPopup align="start" sideOffset={4}>
                                <MenuItem>
                                  <Hammer />
                                  {ticket.valid ? "Disble" : "Enable"}
                                </MenuItem>
                                <MenuItem>
                                  <CreditCard />
                                  Process Refund
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
            <p className="text-sm text-muted-foreground">
              Total pages: {tickets?.totalPages}
            </p>
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
