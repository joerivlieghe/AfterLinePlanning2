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
import { getStatusColor, getEfficiencyColor, formatTime, getAvailableShiftHours, getPriorityScore } from '@/lib/data';
import { UsersIcon, ClockIcon, GaugeIcon, WrenchIcon, InfoIcon, TruckIcon, SearchIcon, FilterIcon, CalendarDaysIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react';
import { Operator, Truck, Shift, RepairType, ProposedAssignment } from '@/types';
import { useToast } from '@/hooks/use-toast';

const OperatorSelection: React.FC = () => {
  const { operators, trucks, prioritizedTrucks, assignOperatorToTruck } = useAppContext();
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
  const [proposedAssignments, setProposedAssignments] = useState<ProposedAssignment[]>([]);

  useEffect(() => {
    if (location.state && (location.state as { openWizard?: boolean }).openWizard) {
      setIsWizardOpen(true);
      setWizardStep(1);
      setSelectedShiftForWizard(null);
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
      const assignedRepairTime = operator.assignedTrucks.reduce((sum, truck) => sum + truck.repairTimeEstimate, 0);
      const totalShiftHours = (operator.shiftEndTime.getTime() - operator.shiftStartTime.getTime()) / (1000 * 60 * 60);
      const occupancyRate = totalShiftHours > 0 ? (assignedRepairTime / totalShiftHours) : 0;
      return { ...operator, occupancyRate };
    });

    // Sort by occupancy rate (descending)
    operatorsWithOccupancy.sort((a, b) => b.occupancyRate - a.occupancyRate);

    return operatorsWithOccupancy;
  }, [operators, searchTerm, filterShift, filterStatus, filterCompetency]);

  const startAutoAssignWizard = () => {
    setIsWizardOpen(true);
    setWizardStep(1);
    setSelectedShiftForWizard(null);
    setProposedAssignments([]);
  };

  const generateProposals = () => {
    if (!selectedShiftForWizard) return;

    const tempOperators = new Map(operators.map(op => [op.id, {
      ...op,
      simulatedAvailableHours: getAvailableShiftHours(op),
      simulatedAssignedTrucksCount: op.assignedTrucks.length, // Track existing assignments
    }]));

    // Filter for trucks that are ready for assignment AND have no operators currently assigned
    const unassignedPrioritizedTrucks = [...prioritizedTrucks].filter(truck =>
      truck.assignedOperatorIds.length === 0 && // Only consider trucks with no assigned operators for wizard
      truck.status !== 'Completed' && truck.status !== 'Ready to Finish' && truck.status !== 'Partial'
    );

    const newProposals: ProposedAssignment[] = [];

    unassignedPrioritizedTrucks.sort((a, b) => getPriorityScore(b).totalScore - getPriorityScore(a).totalScore);

    for (const truck of unassignedPrioritizedTrucks) {
      const totalTruckWorkTime = truck.repairTimeEstimate; // repairTimeEstimate already includes CA time

      const suitableOperator = Array.from(tempOperators.values())
        .filter(op =>
          op.shift === selectedShiftForWizard &&
          op.status === 'Available' &&
          (op.competencies.includes(truck.repairType) || (truck.customerAdaptationWork && op.competencies.includes('Customer Adaptation'))) &&
          op.simulatedAvailableHours >= totalTruckWorkTime &&
          op.simulatedAssignedTrucksCount < 3 // Max 3 trucks per operator
        )
        .sort((a, b) => a.simulatedAvailableHours - b.simulatedAvailableHours)
        .find(Boolean);

      if (suitableOperator) {
        const operatorBeforeHours = suitableOperator.simulatedAvailableHours;
        suitableOperator.simulatedAvailableHours -= totalTruckWorkTime;
        suitableOperator.simulatedAssignedTrucksCount++;

        newProposals.push({
          truck,
          operator: suitableOperator,
          rejected: false,
          operatorAvailableHoursBefore: operatorBeforeHours,
          operatorAvailableHoursAfter: suitableOperator.simulatedAvailableHours,
        });
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
  };

  const REPAIR_TYPES: RepairType[] = ['Mechanical', 'Electrical', 'Software', 'Paint', 'Customer Adaptation'];

  const totalProposedTrucks = proposedAssignments.filter(p => !p.rejected).length;
  const totalProposedRepairTime = proposedAssignments
    .filter(p => !p.rejected)
    .reduce((sum, p) => sum + p.truck.repairTimeEstimate, 0);

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
              const availableHours = getAvailableShiftHours(operator);
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
                      <span>Assigned Trucks: {operator.assignedTrucks.length}</span>
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
              {wizardStep === 1 && "Select a shift to run the auto-assignment for."}
              {wizardStep === 2 && "Review the proposed assignments. You can reject individual assignments before confirming."}
            </DialogDescription>
          </DialogHeader> {/* Corrected: Removed duplicate DialogDescription closing tag */}

          {wizardStep === 1 && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <h3 className="text-lg font-semibold">Choose Shift for Assignment</h3>
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
              <Button onClick={generateProposals} disabled={!selectedShiftForWizard}>
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
                            <TableCell>{(proposal.truck.repairTimeEstimate).toFixed(2)} hrs</TableCell>
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
                  <p className="text-muted-foreground text-center py-8">No suitable assignments found for this shift.</p>
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
