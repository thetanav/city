import { Suspense } from "react";

import SignIn from "@/components/auth/sign-in";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center">
      <Card className="w-full">
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl">Sign in</CardTitle>
          <CardDescription>
            Use your Google account to manage tickets, purchases, and events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={<div className="text-sm text-muted-foreground">Loading sign-in flow...</div>}
          >
            <SignIn />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
