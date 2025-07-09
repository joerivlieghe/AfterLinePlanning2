import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getStatusColor, getEfficiencyColor, formatTime, getAvailableShiftHours, getPriorityScore, calculateRemainingRepairTime } from '@/lib/data';
import { UsersIcon, ClockIcon, GaugeIcon, WrenchIcon, InfoIcon, TruckIcon, SearchIcon, FilterIcon, CalendarDaysIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react';
import { Operator, Shift, RepairType, ProposedAssignment } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

const OperatorSelection: React.FC = () => {
  const { operators, trucks, assignOperatorToTruck } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterShift, setFilterShift] = useState<Shift | 'All'>('All');
  const [filterStatus, setFilterStatus] = useState<Operator['status'] | 'All'>('All');
  const [filterCompetency, setFilterCompetency] = useState<RepairType | 'All'>('All');

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedShiftForWizard, setSelectedShiftForWizard] = useState<Shift | null>(null);
  const [planningDateForWizard, setPlanningDateForWizard] = useState<Date>(new Date());
  const [proposedAssignments, setProposedAssignments] = useState<ProposedAssignment[]>([]);

  useEffect(() => {
    if (location.state && (location.state as { openWizard?: boolean }).openWizard) {
      setIsWizardOpen(true);
      setWizardStep(1);
      setSelectedShiftForWizard(null);
      setPlanningDateForWizard(new Date()); // Default to today
      setProposedAssignments([]);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const handleOperatorClick = (operatorId: string) => {
    navigate(`/operator/${operatorId}`);
  };

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

    // Calculate occupancy rate for sorting and add it to the operator object
    const operatorsWithOccupancy = filtered.map(operator => {
      const assignedRepairTime = operator.assignedTruckIds.reduce((sum, truckId) => {
        const truck = trucks.find(t => t.id === truckId);
        return sum + (truck ? calculateRemainingRepairTime(truck) : 0);
      }, 0);
      const totalShiftHours = (operator.shiftEndTime.getTime() - operator.shiftStartTime.getTime()) / (1000 * 60 * 60);
      const occupancyRate = totalShiftHours > 0 ? (assignedRepairTime / totalShiftHours) : 0;
      return { ...operator, occupancyRate };
    });

    // Sort by occupancy rate (descending)
    operatorsWithOccupancy.sort((a, b) => b.occupancyRate - a.occupancyRate);

    return operatorsWithOccupancy;
  }, [operators, searchTerm, filterShift, filterStatus, filterCompetency, trucks]);

  const startAutoAssignWizard = () => {
    setIsWizardOpen(true);
    setWizardStep(1);
    setSelectedShiftForWizard(null);
    setPlanningDateForWizard(new Date()); // Reset to today
    setProposedAssignments([]);
  };

  const generateProposals = () => {
    if (!selectedShiftForWizard || !planningDateForWizard) return;

    // Create a deep copy of operators for simulation, including their current assigned trucks' *remaining* repair times
    const tempOperators = new Map(operators.map(op => {
      const currentAssignedWorkload = op.assignedTruckIds.reduce((sum, truckId) => {
        const truck = trucks.find(t => t.id === truckId);
        return sum + (truck ? calculateRemainingRepairTime(truck) : 0);
      }, 0);

      const totalShiftDurationHours = (op.shiftEndTime.getTime() - op.shiftStartTime.getTime()) / (1000 * 60 * 60);
      let simulatedAvailableHours = Math.max(0, totalShiftDurationHours - currentAssignedWorkload);

      // If planning for today, adjust available hours based on current time
      if (format(planningDateForWizard, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) {
        const shiftStartOnPlanningDate = new Date(planningDateForWizard);
        shiftStartOnPlanningDate.setHours(op.shiftStartTime.getHours(), op.shiftStartTime.getMinutes(), 0, 0);
        const shiftEndOnPlanningDate = new Date(planningDateForWizard);
        shiftEndOnPlanningDate.setHours(op.shiftEndTime.getHours(), op.shiftEndTime.getMinutes(), 0, 0);
        const now = new Date();

        if (now > shiftEndOnPlanningDate) {
          simulatedAvailableHours = 0;
        } else if (now < shiftStartOnPlanningDate) {
          // Shift hasn't started yet, full duration available
          // simulatedAvailableHours is already calculated based on full duration
        } else {
          // Shift in progress, calculate remaining time from now
          simulatedAvailableHours = (shiftEndOnPlanningDate.getTime() - now.getTime()) / (1000 * 60 * 60) - currentAssignedWorkload;
        }
      }

      if (op.status === 'Off Duty' || op.status === 'On Break') {
        simulatedAvailableHours = 0;
      }

      return [op.id, {
        ...op,
        simulatedAvailableHours: Math.max(0, simulatedAvailableHours),
        simulatedAssignedTrucksCount: op.assignedTruckIds.length,
        simulatedAssignedTruckIds: [...op.assignedTruckIds], // Track assigned truck IDs for simulation
      }];
    }));

    // Filter for trucks that are ready for assignment AND have no operators currently assigned
    // Also, ensure they are not 'Completed' or 'Ready to Finish' or 'Partial'
    const unassignedPrioritizedTrucks = [...trucks].filter(truck =>
      truck.assignedOperatorIds.length === 0 && // Only consider trucks with no assigned operators for wizard
      truck.status !== 'Completed' && truck.status !== 'Ready to Finish' && truck.status !== 'Partial' &&
      calculateRemainingRepairTime(truck) > 0 // Only consider trucks with actual remaining work
    );

    // Sort trucks by priority score (descending)
    unassignedPrioritizedTrucks.sort((a, b) => getPriorityScore(b).totalScore - getPriorityScore(a).totalScore);

    const newProposals: ProposedAssignment[] = [];
    const assignedTruckIdsInProposal = new Set<string>();

    // Iterate through operators and try to fill their shifts with high-priority trucks
    // Sort operators by their current simulated available hours (ascending) to fill up smaller gaps first,
    // or by efficiency, or by current workload. Let's try by available hours (ascending) to fill up those with less time first.
    const operatorsToConsider = Array.from(tempOperators.values()).filter(op => op.simulatedAvailableHours > 0);
    operatorsToConsider.sort((a, b) => a.simulatedAvailableHours - b.simulatedAvailableHours);

    for (const operator of operatorsToConsider) {
      // Keep trying to assign trucks to this operator until their shift is full or max trucks reached
      while (operator.simulatedAvailableHours > 0 && operator.simulatedAssignedTrucksCount < 3) {
        // Find the highest priority unassigned truck that this operator can handle
        const suitableTruck = unassignedPrioritizedTrucks.find(truck => {
          const truckRemainingTime = calculateRemainingRepairTime(truck);
          return (
            !assignedTruckIdsInProposal.has(truck.id) && // Not already proposed for assignment
            truck.status !== 'Completed' && // Ensure it's not completed
            truckRemainingTime > 0 && // Ensure it has work
            operator.shift === selectedShiftForWizard && // Operator must be on the selected shift
            operator.status === 'Available' && // Operator must be available (simulated status)
            (operator.competencies.includes(truck.repairType) || (truck.customerAdaptationWork && operator.competencies.includes('Customer Adaptation'))) &&
            operator.simulatedAvailableHours >= truckRemainingTime
          );
        });

        if (suitableTruck) {
          const operatorBeforeHours = operator.simulatedAvailableHours;
          operator.simulatedAvailableHours -= calculateRemainingRepairTime(suitableTruck);
          operator.simulatedAssignedTrucksCount++;
          operator.simulatedAssignedTruckIds.push(suitableTruck.id); // Track simulated assignment

          newProposals.push({
            truck: suitableTruck,
            operator: operator, // This is the tempOperator object
            rejected: false,
            operatorAvailableHoursBefore: operatorBeforeHours,
            operatorAvailableHoursAfter: operator.simulatedAvailableHours,
          });
          assignedTruckIdsInProposal.add(suitableTruck.id);

          // Remove the assigned truck from the unassigned list to prevent re-assignment
          const index = unassignedPrioritizedTrucks.findIndex(t => t.id === suitableTruck.id);
          if (index > -1) {
            unassignedPrioritizedTrucks.splice(index, 1);
          }
        } else {
          // No more suitable trucks for this operator, move to the next operator
          break;
        }
      }
    }

    setProposedAssignments(newProposals);
    setWizardStep(2);
  };

  const toggleProposalRejection = (index: number) => {
    setProposedAssignments(prev =>
      prev.map((p, i) => (i === index ? { ...p, rejected: !p.rejected } : p))
    );
  };

  const confirmAssignments = () => {
    let assignedCount = 0;
    for (const proposal of proposedAssignments) {
      if (!proposal.rejected) {
        assignOperatorToTruck(proposal.truck.id, proposal.operator.id);
        assignedCount++;
      }
    }
    toast({
      title: "Assignments Confirmed",
      description: `${assignedCount} trucks assigned to operators.`,
      variant: "default",
    });
    setIsWizardOpen(false);
    setProposedAssignments([]);
    setSelectedShiftForWizard(null);
    setPlanningDateForWizard(new Date());
  };

  const REPAIR_TYPES: RepairType[] = ['Mechanical', 'Electrical', 'Software', 'Paint', 'Customer Adaptation'];

  const totalProposedTrucks = proposedAssignments.filter(p => !p.rejected).length;
  const totalProposedRepairTime = proposedAssignments
    .filter(p => !p.rejected)
    .reduce((sum, p) => sum + calculateRemainingRepairTime(p.truck), 0);

  return (
    <div className="p-6 flex flex-col h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Operator Overview</h1>
      <p className="text-lg text-gray-700 mb-8">Select an operator to view their assigned trucks and manage tasks.</p>

      <div className="flex flex-wrap gap-4 mb-6 items-center">
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

        <Button onClick={startAutoAssignWizard} className="ml-auto bg-blue-600 hover:bg-blue-700 text-white">
          <TruckIcon className="mr-2 h-4 w-4" /> Auto-Assign Wizard
        </Button>
      </div>

      <ScrollArea className="flex-1 pr-4 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredOperators.length > 0 ? (
            filteredOperators.map((operator) => {
              const availableHours = getAvailableShiftHours(operator, trucks); // Pass trucks for lookup
              const occupancyRate = operator.occupancyRate;

              return (
                <Card
                  key={operator.id}
                  className="cursor-pointer hover:shadow-xl transition-shadow duration-200 bg-white rounded-lg shadow-md overflow-hidden"
                  onClick={() => handleOperatorClick(operator.id)}
                >
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-lg font-semibold flex items-center">
                      <UsersIcon className="mr-2 h-5 w-5 text-primary" /> {operator.name}
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-600">ID: {operator.id}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-1 text-gray-700">
                    <div className="flex items-center text-sm">
                      <Badge className={getStatusColor(operator.status)}>{operator.status}</Badge>
                      <Badge variant="outline" className="ml-2 text-xs px-2 py-0.5">
                        {operator.shift} Shift
                      </Badge>
                    </div>
                    <div className="flex items-center text-sm">
                      <ClockIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>Shift: {formatTime(operator.shiftStartTime)} - {formatTime(operator.shiftEndTime)}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <InfoIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>Available: <span className="font-semibold">{availableHours.toFixed(1)} hrs</span></span>
                    </div>
                    <div className="flex items-center text-sm">
                      <GaugeIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>Occupancy: <span className={getEfficiencyColor(occupancyRate)}>{(occupancyRate * 100).toFixed(0)}%</span></span>
                    </div>
                    <div className="flex items-center text-sm">
                      <TruckIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>Assigned Trucks: {operator.assignedTruckIds.length}</span>
                    </div>
                    <div className="mt-2">
                      <h3 className="font-semibold text-sm mb-1 flex items-center">
                        <WrenchIcon className="mr-2 h-4 w-4" /> Competencies:
                      </h3>
                      <div className="flex flex-wrap gap-1">
                        {operator.competencies.map((comp, index) => (
                          <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5">
                            {comp}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <p className="col-span-full text-center text-muted-foreground py-12">No operators found matching your criteria.</p>
          )}
        </div>
      </ScrollArea>

      {/* Auto-Assign Wizard Dialog */}
      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Auto-Assign Wizard - Step {wizardStep}</DialogTitle>
            <DialogDescription>
              {wizardStep === 1 && "Select a shift and planning day to run the auto-assignment for."}
              {wizardStep === 2 && "Review the proposed assignments. You can reject individual assignments before confirming."}
            </DialogDescription>
          </DialogHeader>

          {wizardStep === 1 && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <h3 className="text-lg font-semibold">Choose Shift and Planning Day for Assignment</h3>
              <Select onValueChange={(value: Shift) => setSelectedShiftForWizard(value)} value={selectedShiftForWizard || ''}>
                <SelectTrigger className="w-[200px]">
                  <CalendarDaysIcon className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Select Shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Early">Early Shift</SelectItem>
                  <SelectItem value="Late">Late Shift</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={format(planningDateForWizard, 'yyyy-MM-dd')}
                onChange={(e) => setPlanningDateForWizard(parseISO(e.target.value))}
                className="w-[200px]"
              />
              <Button onClick={generateProposals} disabled={!selectedShiftForWizard || !planningDateForWizard}>
                Generate Proposals
              </Button>
            </div>
          )}

          {wizardStep === 2 && (
            <>
              <ScrollArea className="flex-1 pr-4">
                {proposedAssignments.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Truck Chassis</TableHead>
                          <TableHead>Repair Type</TableHead>
                          <TableHead>Repair Time</TableHead>
                          <TableHead>Priority Score</TableHead>
                          <TableHead>Assigned Operator</TableHead>
                          <TableHead>Op. Avail. (Before)</TableHead>
                          <TableHead>Op. Avail. (After)</TableHead>
                          <TableHead className="text-center">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {proposedAssignments.map((proposal, index) => (
                          <TableRow key={proposal.truck.id} className={proposal.rejected ? 'bg-red-50/50 opacity-70' : ''}>
                            <TableCell className="font-medium">{proposal.truck.chassisNumber}</TableCell>
                            <TableCell>{proposal.truck.repairType}</TableCell>
                            <TableCell>{(calculateRemainingRepairTime(proposal.truck)).toFixed(2)} hrs</TableCell>
                            <TableCell>{getPriorityScore(proposal.truck).totalScore}</TableCell>
                            <TableCell>{proposal.operator.name}</TableCell>
                            <TableCell>{proposal.operatorAvailableHoursBefore.toFixed(1)} hrs</TableCell>
                            <TableCell>{proposal.operatorAvailableHoursAfter.toFixed(1)} hrs</TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleProposalRejection(index)}
                                className={proposal.rejected ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'}
                              >
                                {proposal.rejected ? <CheckCircleIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 p-4 bg-gray-50 rounded-md border">
                      <h4 className="text-lg font-semibold mb-2">Assignment Summary</h4>
                      <p>Total Trucks Proposed: <span className="font-bold">{proposedAssignments.length}</span></p>
                      <p>Trucks to be Assigned: <span className="font-bold text-blue-600">{totalProposedTrucks}</span></p>
                      <p>Total Estimated Repair Time: <span className="font-bold">{totalProposedRepairTime.toFixed(2)} hrs</span></p>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No suitable assignments found for this shift and planning day.</p>
                )}
              </ScrollArea>
              <DialogFooter className="mt-4 flex justify-between">
                <Button variant="outline" onClick={() => setWizardStep(1)}>Re-run Wizard</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsWizardOpen(false)}>Manual Assign</Button>
                  <Button onClick={confirmAssignments} disabled={totalProposedTrucks === 0}>
                    Confirm Assignments ({totalProposedTrucks})
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OperatorSelection;
