import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Operator, Truck, RepairType, Shift } from '@/types';
import { getStatusColor, getEfficiencyColor, formatTime, getAvailableShiftHours, calculateRemainingRepairTime } from '@/lib/data';
import { SearchIcon, FilterIcon, WrenchIcon, UsersIcon, ClockIcon, GaugeIcon, InfoIcon, TruckIcon } from 'lucide-react';

interface OperatorListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOperator: (operatorId: string) => void;
  currentTruck: Truck;
  operators: Operator[];
  allTrucks: Truck[]; // Pass all trucks for getAvailableShiftHours
}

const OperatorListDialog: React.FC<OperatorListDialogProps> = ({
  isOpen,
  onClose,
  onSelectOperator,
  currentTruck,
  operators,
  allTrucks,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShift, setFilterShift] = useState<Shift | 'All'>('All');
  const [filterStatus, setFilterStatus] = useState<Operator['status'] | 'All'>('All');
  const [filterCompetency, setFilterCompetency] = useState<RepairType | 'All'>('All');

  const REPAIR_TYPES: RepairType[] = ['Mechanical', 'Electrical', 'Software', 'Paint', 'Customer Adaptation'];

  const filteredOperators = useMemo(() => {
    let filtered = operators;

    if (searchTerm) {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(operator =>
        operator.name.toLowerCase().includes(lowercasedSearchTerm)
      );
    }

    if (filterShift !== 'All') {
      filtered = filtered.filter(operator => operator.shift === filterShift);
    }

    if (filterStatus !== 'All') {
      filtered = filtered.filter(operator => operator.status === filterStatus);
    }

    if (filterCompetency !== 'All') {
      filtered = filtered.filter(operator => operator.competencies.includes(filterCompetency));
    }

    // Filter by competency for the current truck's repair type
    filtered = filtered.filter(operator =>
      operator.competencies.includes(currentTruck.repairType) ||
      (currentTruck.customerAdaptationWork && operator.competencies.includes('Customer Adaptation'))
    );

    // Filter out operators who are already assigned to this truck
    filtered = filtered.filter(operator => !currentTruck.assignedOperatorIds.includes(operator.id));

    // Calculate occupancy rate for sorting and add it to the operator object
    const operatorsWithOccupancy = filtered.map(operator => {
      const assignedRepairTime = operator.assignedTruckIds.reduce((sum: number, truckId: string) => {
        const truck = allTrucks.find(t => t.id === truckId);
        return sum + (truck ? calculateRemainingRepairTime(truck) : 0);
      }, 0);
      const totalShiftHours = (operator.shiftEndTime.getTime() - operator.shiftStartTime.getTime()) / (1000 * 60 * 60);
      const occupancyRate = totalShiftHours > 0 ? (assignedRepairTime / totalShiftHours) : 0;
      return { ...operator, occupancyRate };
    });

    // Sort by occupancy rate (ascending) to prioritize less busy operators
    operatorsWithOccupancy.sort((a, b) => a.occupancyRate - b.occupancyRate);

    return operatorsWithOccupancy;
  }, [operators, searchTerm, filterShift, filterStatus, filterCompetency, currentTruck, allTrucks]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Operator to Truck {currentTruck.chassisNumber}</DialogTitle>
          <DialogDescription>
            Select an operator to assign to this truck. Only operators competent in "{currentTruck.repairType}" and not already assigned are shown.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-4 mb-4 items-center">
          <div className="relative flex-grow max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 border rounded-md w-full"
            />
          </div>

          <Select value={filterShift} onValueChange={(value: Shift | 'All') => setFilterShift(value)}>
            <SelectTrigger className="w-[180px]">
              <FilterIcon className="mr-2 h-4 w-4 text-gray-500" />
              <SelectValue placeholder="Filter by Shift" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Shifts</SelectItem>
              <SelectItem value="Early">Early Shift</SelectItem>
              <SelectItem value="Late">Late Shift</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={(value: Operator['status'] | 'All') => setFilterStatus(value)}>
            <SelectTrigger className="w-[180px]">
              <FilterIcon className="mr-2 h-4 w-4 text-gray-500" />
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Busy">Busy</SelectItem>
              <SelectItem value="On Break">On Break</SelectItem>
              <SelectItem value="Off Duty">Off Duty</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCompetency} onValueChange={(value: RepairType | 'All') => setFilterCompetency(value)}>
            <SelectTrigger className="w-[180px]">
              <WrenchIcon className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by Competency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Competencies</SelectItem>
              {REPAIR_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1 pr-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOperators.length > 0 ? (
              filteredOperators.map((operator) => {
                const availableHours = getAvailableShiftHours(operator, allTrucks);
                const occupancyRate = operator.occupancyRate;

                return (
                  <div
                    key={operator.id}
                    className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => onSelectOperator(operator.id)}
                  >
                    <h3 className="font-semibold text-lg flex items-center mb-1">
                      <UsersIcon className="mr-2 h-5 w-5 text-primary" /> {operator.name}
                    </h3>
                    <div className="flex items-center text-sm mb-2">
                      <Badge className={getStatusColor(operator.status)}>{operator.status}</Badge>
                      <Badge variant="outline" className="ml-2 text-xs px-2 py-0.5">
                        {operator.shift} Shift
                      </Badge>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center">
                        <ClockIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>Shift: {formatTime(operator.shiftStartTime)} - {formatTime(operator.shiftEndTime)}</span>
                      </div>
                      <div className="flex items-center">
                        <InfoIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>Available: <span className="font-semibold">{availableHours.toFixed(1)} hrs</span></span>
                      </div>
                      <div className="flex items-center">
                        <GaugeIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>Occupancy: <span className={getEfficiencyColor(occupancyRate)}>{(occupancyRate * 100).toFixed(0)}%</span></span>
                      </div>
                      <div className="flex items-center">
                        <TruckIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>Assigned Trucks: {operator.assignedTruckIds.length}</span>
                      </div>
                      <div className="mt-2">
                        <h4 className="font-semibold text-sm mb-1 flex items-center">
                          <WrenchIcon className="mr-2 h-4 w-4" /> Competencies:
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {operator.competencies.map((comp, index) => (
                            <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5">
                              {comp}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="col-span-full text-center text-muted-foreground py-12">No suitable operators found.</p>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OperatorListDialog;
