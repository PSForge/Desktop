import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function GUIBuilderTab() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <Card className="max-w-2xl w-full">
        <CardContent className="p-12 text-center">
          <Construction className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-semibold mb-2">GUI Builder Coming Soon</h2>
          <p className="text-muted-foreground">
            This tab will allow you to build PowerShell GUI applications visually.
            Stay tuned for updates!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
