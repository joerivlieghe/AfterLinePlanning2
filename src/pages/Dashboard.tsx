import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import TruckCard from '@/components/TruckCard';
import OperatorCard from '@/components/OperatorCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAvailableShiftHours, getStatusColor } from '@/lib/data';
import { SearchIcon, UsersIcon, WrenchIcon, CheckCircleIcon, ClockIcon, AlertCircleIcon, PackageXIcon, TruckIcon, UserPlusIcon } from 'lucide-react';
import { Truck } from '@/types';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { trucks, operators, setTrucks, setOperators, prioritizedTrucks } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);
  const [showRepairTimeWarning, setShowRepairTimeWarning] = useState(false);

  // New Kanban Column Filters
  const overdueMissingPartsTrucks = useMemo(() =>
    trucks.filter(truck => truck.status === 'Overdue - Not Ready')
    .sort((a, b) => a.deliveryDate.getTime() - b.deliveryDate.getTime()), // Sort by delivery date ascending
    [trucks]
  );

  const notReadyMissingPartsTrucks = useMemo(() =>
    trucks.filter(truck => truck.status === 'Not Ready')
    .sort((a, b) => a.deliveryDate.getTime() - b.deliveryDate.getTime()), // Sort by delivery date ascending
    [trucks]
  );

  const overdueReadyToPlanTrucks = useMemo(() =>
    prioritizedTrucks.filter(truck => truck.status === 'Overdue - Ready to Plan'),
    [prioritizedTrucks]
  );

  const readyToPlanTrucks = useMemo(() =>
    prioritizedTrucks.filter(truck => truck.status === 'Ready to Plan'),
    [prioritizedTrucks]
  );

  const assignedTrucks = useMemo(() =>
    trucks.filter(truck => truck.status === 'Assigned'),
    [trucks]
  );

  const partialTrucks = useMemo(() => trucks.filter(truck => truck.status === 'Partial'), [trucks]);
  const readyToFinishTrucks = useMemo(() => trucks.filter(truck => truck.status === 'Ready to Finish'), [trucks]); // Renamed from inProgressTrucks
  const completedTrucks = useMemo(() => trucks.filter(truck => truck.status === 'Completed'), [trucks]);

  const filteredOperators = useMemo(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return operators.filter(operator =>
      operator.name.toLowerCase().includes(lowercasedSearchTerm) ||
      operator.competencies.some(comp => comp.toLowerCase().includes(lowercasedSearchTerm)) ||
      operator.status.toLowerCase().includes(lowercasedSearchTerm)
    );
  }, [operators, searchTerm]);

  const handleAssignClick = (truckId: string) => {
    setSelectedTruckId(truckId);
    setIsAssignDialogOpen(true);
    setShowRepairTimeWarning(false); // Reset warning
  };

  const handleAssignTruck = () => {
    if (selectedTruckId && selectedOperatorId) {
      const truckToAssign = trucks.find(t => t.id === selectedTruckId);
      const operatorToAssign = operators.find(op => op.id === selectedOperatorId);

      if (!truckToAssign || !operatorToAssign) return;

      const availableHours = getAvailableShiftHours(operatorToAssign);
      if (truckToAssign.repairTimeEstimate > availableHours && !showRepairTimeWarning) {
        setShowRepairTimeWarning(true);
        return; // Show warning first, then allow re-click to proceed
      }

      setTrucks(prevTrucks =>
        prevTrucks.map(truck =>
          truck.id === selectedTruckId
            ? { ...truck, assignedOperatorId: selectedOperatorId, status: 'Assigned' } // Set status to Assigned
            : truck
        )
      );

      setOperators(prevOperators =>
        prevOperators.map(operator =>
          operator.id === selectedOperatorId
            ? {
                ...operator,
                assignedTrucks: [
                  ...operator.assignedTrucks,
                  trucks.find(t => t.id === selectedTruckId)!,
                ],
                status: 'Busy', // Set operator to busy
              }
            : operator
        )
      );

      setIsAssignDialogOpen(false);
      setSelectedTruckId(null);
      setSelectedOperatorId(null);
      setShowRepairTimeWarning(false);
    }
  };

  const availableOperators = useMemo(() => {
    if (!selectedTruckId) return [];
    const truckToAssign = trucks.find(t => t.id === selectedTruckId);
    if (!truckToAssign) return [];

    return operators.filter(op =>
      op.status === 'Available' &&
      op.competencies.includes(truckToAssign.repairType)
      // We don't filter by available hours here, as we want to show a warning instead
    );
  }, [operators, selectedTruckId, trucks]);

  const selectedOperatorAvailableHours = useMemo(() => {
    if (!selectedOperatorId) return 0;
    const operator = operators.find(op => op.id === selectedOperatorId);
    return operator ? getAvailableShiftHours(operator) : 0;
  }, [selectedOperatorId, operators]);

  const selectedTruckRepairTime = useMemo(() => {
    if (!selectedTruckId) return 0;
    const truck = trucks.find(t => t.id === selectedTruckId);
    return truck ? truck.repairTimeEstimate : 0;
  }, [selectedTruckId, trucks]);

  const handleOpenWizard = () => {
    navigate('/operators', { state: { openWizard: true } });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900">Workshop Dashboard</h1>
        <Button onClick={handleOpenWizard} className="bg-blue-600 hover:bg-blue-700 text-white">
          <TruckIcon className="mr-2 h-4 w-4" /> Auto-Assign Wizard
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8 gap-6">
        {/* Overdue - Missing Parts Column */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2 text-gray-800 flex items-center">
            <AlertCircleIcon className="mr-2 h-5 w-5 text-red-600" /> Overdue - Missing Parts ({overdueMissingPartsTrucks.length})
          </h2>
          <p className="text-sm text-muted-foreground mb-4">Priority score is 0 due to pending missing parts.</p>
          <ScrollArea className="h-[calc(100vh-250px)] pr-4">
            <div className="space-y-4">
              {overdueMissingPartsTrucks.length > 0 ? (
                overdueMissingPartsTrucks.map(truck => (
                  <TruckCard key={truck.id} truck={truck} />
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8 text-sm">No overdue trucks with missing parts.</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Not Ready - Missing Parts Column */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2 text-gray-800 flex items-center">
            <PackageXIcon className="mr-2 h-5 w-5 text-gray-600" /> Not Ready - Missing Parts ({notReadyMissingPartsTrucks.length})
          </h2>
          <p className="text-sm text-muted-foreground mb-4">Priority score is 0 due to pending missing parts.</p>
          <ScrollArea className="h-[calc(100vh-250px)] pr-4">
            <div className="space-y-4">
              {notReadyMissingPartsTrucks.length > 0 ? (
                notReadyMissingPartsTrucks.map(truck => (
                  <TruckCard key={truck.id} truck={truck} />
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8 text-sm">No trucks not ready due to missing parts.</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Overdue - Ready to Plan Column */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
            <AlertCircleIcon className="mr-2 h-5 w-5 text-red-700" /> Overdue - Ready ({overdueReadyToPlanTrucks.length})
          </h2>
          <ScrollArea className="h-[calc(100vh-250px)] pr-4">
            <div className="space-y-4">
              {overdueReadyToPlanTrucks.length > 0 ? (
                overdueReadyToPlanTrucks.map(truck => (
                  <TruckCard key={truck.id} truck={truck} onAssignClick={handleAssignClick} />
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8 text-sm">No overdue trucks ready to plan.</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Ready to Plan Column */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
            <ClockIcon className="mr-2 h-5 w-5 text-blue-600" /> Ready to Plan ({readyToPlanTrucks.length})
          </h2>
          <ScrollArea className="h-[calc(100vh-250px)] pr-4">
            <div className="space-y-4">
              {readyToPlanTrucks.length > 0 ? (
                readyToPlanTrucks.map(truck => (
                  <TruckCard key={truck.id} truck={truck} onAssignClick={handleAssignClick} />
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8 text-sm">No trucks ready to plan.</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Assigned Column */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
            <UserPlusIcon className="mr-2 h-5 w-5 text-indigo-600" /> Assigned ({assignedTrucks.length})
          </h2>
          <ScrollArea className="h-[calc(100vh-250px)] pr-4">
            <div className="space-y-4">
              {assignedTrucks.length > 0 ? (
                assignedTrucks.map(truck => (
                  <TruckCard key={truck.id} truck={truck} />
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8 text-sm">No assigned trucks.</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Partial Column */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
            <WrenchIcon className="mr-2 h-5 w-5 text-orange-600" /> Partial ({partialTrucks.length})
          </h2>
          <ScrollArea className="h-[calc(100vh-250px)] pr-4">
            <div className="space-y-4">
              {partialTrucks.length > 0 ? (
                partialTrucks.map(truck => (
                  <TruckCard key={truck.id} truck={truck} />
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8 text-sm">No partial trucks.</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Ready to Finish Column (formerly In Progress) */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
            <WrenchIcon className="mr-2 h-5 w-5 text-yellow-600" /> Ready to Finish ({readyToFinishTrucks.length})
          </h2>
          <ScrollArea className="h-[calc(100vh-250px)] pr-4">
            <div className="space-y-4">
              {readyToFinishTrucks.length > 0 ? (
                readyToFinishTrucks.map(truck => (
                  <TruckCard key={truck.id} truck={truck} />
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8 text-sm">No trucks ready to finish.</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Completed Column */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
            <CheckCircleIcon className="mr-2 h-5 w-5 text-green-600" /> Completed ({completedTrucks.length})
          </h2>
          <ScrollArea className="h-[calc(100vh-250px)] pr-4">
            <div className="space-y-4">
              {completedTrucks.length > 0 ? (
                completedTrucks.map(truck => (
                  <TruckCard key={truck.id} truck={truck} />
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8 text-sm">No completed trucks.</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Assign Operator Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Assign Truck to Operator</DialogTitle>
            <DialogDescription>
              Select an available operator to assign to truck {selectedTruckId}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 py-4">
            {availableOperators.length > 0 ? (
              availableOperators.map(operator => (
                <OperatorCard
                  key={operator.id}
                  operator={operator}
                  onClick={() => setSelectedOperatorId(operator.id)}
                  isSelected={selectedOperatorId === operator.id}
                />
              ))
            ) : (
              <p className="col-span-full text-center text-muted-foreground py-8">
                No operators available for this truck's repair type or estimated time.
              </p>
            )}
          </div>
          {selectedOperatorId && showRepairTimeWarning && selectedTruckRepairTime > selectedOperatorAvailableHours && (
            <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mt-4" role="alert">
              <p className="font-bold">Warning!</p>
              <p>The selected operator has only {selectedOperatorAvailableHours.toFixed(1)} hours available, but this truck requires {selectedTruckRepairTime} hours. Assigning this truck will likely lead to overtime or require another operator to finish the job.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAssignDialogOpen(false); setShowRepairTimeWarning(false); }}>Cancel</Button>
            <Button onClick={handleAssignTruck} disabled={!selectedOperatorId}>
              {showRepairTimeWarning ? 'Proceed Anyway' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
