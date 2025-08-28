import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Market, MarketInvoiceDelta } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { EditIcon, SaveIcon, XIcon, GlobeIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EUROPEAN_MARKETS } from '@/lib/data';

const InvoiceDeltaTab: React.FC = () => {
  const { marketInvoiceDeltas, updateMarketInvoiceDelta } = useAppContext();
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentMarketDelta, setCurrentMarketDelta] = useState<MarketInvoiceDelta | null>(null);
  const [deltaDays, setDeltaDays] = useState<string>(''); // Changed from minDays/maxDays
  const [searchTerm, setSearchTerm] = useState('');

  const handleOpenEditDialog = (delta: MarketInvoiceDelta) => {
    setCurrentMarketDelta(delta);
    setDeltaDays(delta.deltaDays.toString()); // Set single deltaDays
    setIsEditDialogOpen(true);
  };

  const handleSaveDelta = () => {
    if (!currentMarketDelta) return;

    const parsedDeltaDays = parseInt(deltaDays, 10); // Parse single deltaDays

    if (isNaN(parsedDeltaDays)) {
      toast({
        title: "Validation Error",
        description: "Delta days must be a valid number.",
        variant: "destructive",
      });
      return;
    }

    updateMarketInvoiceDelta(currentMarketDelta.market, parsedDeltaDays); // Pass single deltaDays
    toast({
      title: "Invoice Delta Updated",
      description: `Invoice delta for "${currentMarketDelta.market}" has been updated to ${parsedDeltaDays} days.`,
    });
    setIsEditDialogOpen(false);
  };

  const filteredDeltas = marketInvoiceDeltas.filter(delta =>
    delta.market.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Input
        placeholder="Search markets..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />

      <ScrollArea className="h-[calc(100vh-350px)] pr-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDeltas.length === 0 ? (
            <p className="col-span-full text-center text-muted-foreground py-12">No markets found.</p>
          ) : (
            filteredDeltas.map((delta) => (
              <Card key={delta.market} className="shadow-md hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xl font-semibold">{delta.market}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(delta)}>
                    <EditIcon className="h-4 w-4 text-blue-500" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center text-sm">
                    <GlobeIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    Invoice Delta: <span className="font-medium ml-1">{delta.deltaDays} days</span>
                  </div>
                  <CardDescription className="text-sm text-gray-600">
                    This number determines how many days after the delivery date the invoice date will fall. A negative value means the invoice date is before the delivery date.
                  </CardDescription>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Invoice Delta for {currentMarketDelta?.market}</DialogTitle>
            <DialogDescription>
              Adjust the fixed number of days for the invoice date relative to the delivery date. Negative values are allowed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deltaDays" className="text-right">
                Delta Days
              </Label>
              <Input
                id="deltaDays"
                type="number"
                value={deltaDays}
                onChange={(e) => setDeltaDays(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              <XIcon className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button onClick={handleSaveDelta}>
              <SaveIcon className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceDeltaTab;
