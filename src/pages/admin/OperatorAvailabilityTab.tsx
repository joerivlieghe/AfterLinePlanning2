import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Operator, OperatorStatus, Shift } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { EditIcon, SaveIcon, XIcon, ClockIcon, InfoIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatTime } from '@/lib/data';

const allOperatorStatuses: OperatorStatus[] = ['Available', 'Busy', 'On Break', 'Off Duty'];
const allShifts: Shift[] = ['Early', 'Late'];

const OperatorAvailabilityTab: React.FC = () => {
  const { operators, updateOperator } = useAppContext();
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentOperator, setCurrentOperator] = useState<Operator | null>(null);
  const [operatorStatus, setOperatorStatus] = useState<OperatorStatus>('Available');
  const [operatorShift, setOperatorShift] = useState<Shift>('Early');
  const [shiftStartTime, setShiftStartTime] = useState('');
  const [shiftEndTime, setShiftEndTime] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleOpenEditDialog = (operator: Operator) => {
    setCurrentOperator(operator);
    setOperatorStatus(operator.status);
    setOperatorShift(operator.shift);
    setShiftStartTime(formatTime(operator.shiftStartTime));
    setShiftEndTime(formatTime(operator.shiftEndTime));
    setIsEditDialogOpen(true);
  };

  const handleSaveAvailability = () => {
    if (!currentOperator) return;

    const [startHours, startMinutes] = shiftStartTime.split(':').map(Number);
    const [endHours, endMinutes] = shiftEndTime.split(':').map(Number);

    if (isNaN(startHours) || isNaN(startMinutes) || isNaN(endHours) || isNaN(endMinutes)) {
      toast({
        title: "Validation Error",
        description: "Invalid time format. Please use HH:MM.",
        variant: "destructive",
      });
      return;
    }

    const newShiftStartTime = new Date(currentOperator.shiftStartTime);
    newShiftStartTime.setHours(startHours, startMinutes, 0, 0);

    const newShiftEndTime = new Date(currentOperator.shiftEndTime);
    newShiftEndTime.setHours(endHours, endMinutes, 0, 0);

    updateOperator(currentOperator.id, {
      status: operatorStatus,
      shift: operatorShift,
      shiftStartTime: newShiftStartTime,
      shiftEndTime: newShiftEndTime,
    });
    toast({
      title: "Availability Updated",
      description: `Availability for "${currentOperator.name}" has been updated.`,
    });
    setIsEditDialogOpen(false);
  };

  const filteredOperators = operators.filter(op =>
    op.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Input
        placeholder="Search operators by name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />

      <ScrollArea className="h-[calc(100vh-350px)] pr-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOperators.length === 0 ? (
            <p className="col-span-full text-center text-muted-foreground py-12">No operators found.</p>
          ) : (
            filteredOperators.map((operator) => (
              <Card key={operator.id} className="shadow-md hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xl font-semibold">{operator.name}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(operator)}>
                    <EditIcon className="h-4 w-4 text-blue-500" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  <CardDescription className="text-sm text-gray-600">ID: {operator.id}</CardDescription>
                  <div className="flex items-center text-sm">
                    <InfoIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    Status: <span className={`font-medium ml-1 ${operator.status === 'Available' ? 'text-green-600' : operator.status === 'Busy' ? 'text-orange-600' : 'text-gray-600'}`}>{operator.status}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <ClockIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    Shift: <span className="font-medium ml-1">{operator.shift} ({formatTime(operator.shiftStartTime)} - {formatTime(operator.shiftEndTime)})</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Availability for {currentOperator?.name}</DialogTitle>
            <DialogDescription>
              Adjust the status and shift times for this operator.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select value={operatorStatus} onValueChange={(value: OperatorStatus) => setOperatorStatus(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  {allOperatorStatuses.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shift" className="text-right">
                Shift
              </Label>
              <Select value={operatorShift} onValueChange={(value: Shift) => setOperatorShift(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Shift" />
                </SelectTrigger>
                <SelectContent>
                  {allShifts.map(shift => (
                    <SelectItem key={shift} value={shift}>{shift}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shiftStartTime" className="text-right">
                Start Time
              </Label>
              <Input
                id="shiftStartTime"
                type="time"
                value={shiftStartTime}
                onChange={(e) => setShiftStartTime(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shiftEndTime" className="text-right">
                End Time
              </Label>
              <Input
                id="shiftEndTime"
                type="time"
                value={shiftEndTime}
                onChange={(e) => setShiftEndTime(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              <XIcon className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button onClick={handleSaveAvailability}>
              <SaveIcon className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OperatorAvailabilityTab;
