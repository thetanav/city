import { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Popover, PopoverPopup, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "./ui/calendar";

type TimeFormProps = {
  startAt: string;
  endAt: string;
  hasEndDate: boolean;
  onStartAtChange: (value: string) => void;
  onEndAtChange: (value: string) => void;
  onHasEndDateChange: (value: boolean) => void;
};

function parseDate(value: string) {
  if (!value) return undefined;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;

  return parsed;
}

function extractTime(value: string) {
  const parsed = parseDate(value);
  if (!parsed) return "12:00:00";

  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  const seconds = String(parsed.getSeconds()).padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

function mergeDateAndTime(date: Date, time: string, includeTime: boolean) {
  const next = new Date(date);

  if (!includeTime) {
    next.setHours(0, 0, 0, 0);
    return next.toISOString();
  }

  const [hours = "0", minutes = "0", seconds = "0"] = time.split(":");
  next.setHours(Number(hours), Number(minutes), Number(seconds), 0);

  return next.toISOString();
}

export default function TimeForm({
  startAt,
  endAt,
  hasEndDate,
  onStartAtChange,
  onEndAtChange,
  onHasEndDateChange,
}: TimeFormProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(() =>
    parseDate(startAt),
  );
  const [endDate, setEndDate] = useState<Date | undefined>(() =>
    parseDate(endAt),
  );
  const [startTime, setStartTime] = useState(() => extractTime(startAt));
  const [endTime, setEndTime] = useState(() => extractTime(endAt));
  const [hasTime, setHasTime] = useState(false);

  useEffect(() => {
    setStartDate(parseDate(startAt));
    setStartTime(extractTime(startAt));
  }, [startAt]);

  useEffect(() => {
    setEndDate(parseDate(endAt));
    setEndTime(extractTime(endAt));
  }, [endAt]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger
              render={
                <Button className="flex-1 justify-start" variant="outline" />
              }>
              <CalendarIcon aria-hidden="true" />
              {startDate ? startDate.toDateString() : "Pick a date"}
            </PopoverTrigger>
            <PopoverPopup>
              <Calendar
                defaultMonth={startDate}
                mode="single"
                onSelect={(date) => {
                  setStartDate(date);

                  if (!date) {
                    onStartAtChange("");
                    return;
                  }

                  onStartAtChange(mergeDateAndTime(date, startTime, hasTime));
                }}
                selected={startDate}
              />
            </PopoverPopup>
          </Popover>
          <Input
            type="time"
            id="start-time-picker"
            step="1"
            value={startTime}
            onChange={(e) => {
              const value = e.target.value;
              setStartTime(value);

              if (!startDate || !hasTime) return;
              onStartAtChange(mergeDateAndTime(startDate, value, true));
            }}
            disabled={!hasTime}
            className="flex-1 appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
        </div>
        <div
          className={`flex gap-2 ${!hasEndDate && "pointer-events-none opacity-50"}`}>
          <Popover>
            <PopoverTrigger
              render={
                <Button className="flex-1 justify-start" variant="outline" />
              }>
              <CalendarIcon aria-hidden="true" />
              {endDate ? endDate.toDateString() : "Pick a date"}
            </PopoverTrigger>
            <PopoverPopup>
              <Calendar
                defaultMonth={endDate}
                mode="single"
                onSelect={(date) => {
                  setEndDate(date);

                  if (!date) {
                    onEndAtChange("");
                    return;
                  }

                  onEndAtChange(mergeDateAndTime(date, endTime, hasTime));
                }}
                selected={endDate}
              />
            </PopoverPopup>
          </Popover>
          <Input
            type="time"
            id="end-time-picker"
            step="1"
            value={endTime}
            onChange={(e) => {
              const value = e.target.value;
              setEndTime(value);

              if (!endDate || !hasTime) return;
              onEndAtChange(mergeDateAndTime(endDate, value, true));
            }}
            disabled={!hasTime}
            className="flex-1 appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex items-center justify-between gap-3">
          <Label>
            <Switch
              checked={hasEndDate}
              onCheckedChange={(value) => onHasEndDateChange(value === true)}
            />
            End dates
          </Label>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label>
            <Switch
              checked={hasTime}
              onCheckedChange={(value) => {
                const next = value === true;
                setHasTime(next);

                if (startDate) {
                  onStartAtChange(mergeDateAndTime(startDate, startTime, next));
                }

                if (hasEndDate && endDate) {
                  onEndAtChange(mergeDateAndTime(endDate, endTime, next));
                }
              }}
            />
            Timing Also
          </Label>
        </div>
      </div>
    </div>
  );
}
