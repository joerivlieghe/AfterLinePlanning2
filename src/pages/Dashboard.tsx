import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import TruckCard from '@/components/TruckCard';
import OperatorCard from '@/components/OperatorCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAvailableShiftHours, getStatusColor, getGeneralRepairTypesNeeded } from '@/lib/data';
import { SearchIcon, UsersIcon, WrenchIcon, CheckCircleIcon, ClockIcon, AlertCircleIcon, PackageXIcon, TruckIcon, UserPlusIcon, BuildingIcon, GlobeIcon, FilterXIcon } from 'lucide-react';
import { Truck, RepairType, TruckStatus } from '@/types';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { REPAIR_TYPES, CUSTOMER_PRIORITIES } from '@/lib/data';

const ALL_TRUCK_STATUSES: TruckStatus[] = [
  'Pending', 'In Progress', 'Partial', 'Completed', 'Overdue',
  'Missing Parts Not Available', 'Assigned', 'Ready to Finish',
  'Overdue - Not Ready', 'Not Ready', 'Overdue - Ready to Plan', 'Ready to Plan'
];

const Dashboard: React.FC = () => {
  const { trucks, operators, assignOperatorToTruck, allProjectCodes, allCustomerNames, allMarkets } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);
  const [showRepairTimeWarning, setShowRepairTimeWarning] = useState(false);

  // Filter states
  const [filterRepairType, setFilterRepairType] = useState<RepairType | 'all'>('all');
  const [filterProjectCode, setFilterProjectCode] = useState<string | 'all'>('all');
  const [filterCustomerPriority, setFilterCustomerPriority] = useState<Truck['customerPriority'] | 'all'>('all');
  const [filterCustomer, setFilterCustomer] = useState<string | 'all'>('all');
  const [filterMarket, setFilterMarket] = useState<string | 'all'>('all');

  // Helper function to apply filters
  const applyFilters = (truckList: Truck[], currentFilterKey?: keyof Truck | 'repairType' | 'customerPriority') => {
    return truckList.filter(truck => {
      const matchesRepairType = currentFilterKey === 'repairType' || filterRepairType === 'all' || truck.repairType === filterRepairType;
      const matchesProjectCode = currentFilterKey === 'projectCode' || filterProjectCode === 'all' || (truck.projectCode === filterProjectCode);
      const matchesCustomerPriority = currentFilterKey === 'customerPriority' || filterCustomerPriority === 'all' || truck.customerPriority === filterCustomerPriority;
      const matchesCustomer = currentFilterKey === 'customer' || filterCustomer === 'all' || truck.customer === filterCustomer;
      const matchesMarket = currentFilterKey === 'market' || filterMarket === 'all' || truck.market === filterMarket;
      return matchesRepairType && matchesProjectCode && matchesCustomerPriority && matchesCustomer && matchesMarket;
    });
  };

  // Memoized options for each filter, dynamically updated based on other filters
  const availableRepairTypes = useMemo(() => {
    const filteredByOthers = applyFilters(trucks, 'repairType');
    const types = new Set<RepairType>();
    filteredByOthers.forEach(truck => types.add(truck.repairType));
    return Array.from(types).sort();
  }, [trucks, filterProjectCode, filterCustomerPriority, filterCustomer, filterMarket]);

  const availableProjectCodes = useMemo(() => {
    const filteredByOthers = applyFilters(trucks, 'projectCode');
    const codes = new Set<string>();
    filteredByOthers.forEach(truck => {
      if (truck.projectCode) codes.add(truck.projectCode);
    });
    return Array.from(codes).sort();
  }, [trucks, filterRepairType, filterCustomerPriority, filterCustomer, filterMarket]);

  const availableCustomerPriorities = useMemo(() => {
    const filteredByOthers = applyFilters(trucks, 'customerPriority');
    const priorities = new Set<Truck['customerPriority']>();
    filteredByOthers.forEach(truck => priorities.add(truck.customerPriority));
    return Array.from(priorities).sort((a, b) => {
      const order = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
      return (order[b] || 0) - (order[a] || 0);
    });
  }, [trucks, filterRepairType, filterProjectCode, filterCustomer, filterMarket]);

  const availableCustomerNames = useMemo(() => {
    const filteredByOthers = applyFilters(trucks, 'customer');
    const names = new Set<string>();
    filteredByOthers.forEach(truck => names.add(truck.customer));
    return Array.from(names).sort();
  }, [trucks, filterRepairType, filterProjectCode, filterCustomerPriority, filterMarket]);

  const availableMarkets = useMemo(() => {
    const filteredByOthers = applyFilters(trucks, 'market');
    const markets = new Set<string>();
    filteredByOthers.forEach(truck => markets.add(truck.market));
    return Array.from(markets).sort();
  }, [trucks, filterRepairType, filterProjectCode, filterCustomerPriority, filterCustomer]);


  // Memoized filtered trucks based on all filters (excluding status)
  const filteredTrucks = useMemo(() => {
    if (!Array.isArray(trucks)) {
      console.error('`trucks` is not an array in filteredTrucks useMemo:', trucks);
      return [];
    }

    const result = trucks.filter(truck => {
      const matchesRepairType = filterRepairType === 'all' || truck.repairType === filterRepairType;
      const matchesProjectCode = filterProjectCode === 'all' || (truck.projectCode === filterProjectCode);
      const matchesCustomerPriority = filterCustomerPriority === 'all' || truck.customerPriority === filterCustomerPriority;
      const matchesCustomer = filterCustomer === 'all' || truck.customer === filterCustomer;
      const matchesMarket = filterMarket === 'all' || truck.market === filterMarket;
      return matchesRepairType && matchesProjectCode && matchesCustomerPriority && matchesCustomer && matchesMarket;
    });
    return result;
  }, [trucks, filterRepairType, filterProjectCode, filterCustomerPriority, filterCustomer, filterMarket]);

  // Kanban Column Filters - now based on filteredTrucks
  const overdueMissingPartsTrucks = useMemo(() =>
    (Array.isArray(filteredTrucks) ? filteredTrucks : [])
    .filter(truck => truck.status === 'Overdue - Not Ready')
    .sort((a, b) => a.deliveryDate.getTime() - b.deliveryDate.getTime()),
    [filteredTrucks]
  );

  const notReadyMissingPartsTrucks = useMemo(() =>
    (Array.isArray(filteredTrucks) ? filteredTrucks : [])
    .filter(truck => truck.status === 'Not Ready')
    .sort((a, b) => a.deliveryDate.getTime() - b.deliveryDate.getTime()),
    [filteredTrucks]
  );

  const overdueReadyToPlanTrucks = useMemo(() =>
    (Array.isArray(filteredTrucks) ? filteredTrucks : [])
    .filter(truck => truck.status === 'Overdue - Ready to Plan')
    .sort((a, b) => a.deliveryDate.getTime() - b.deliveryDate.getTime()),
    [filteredTrucks]
  );

  const readyToPlanTrucks = useMemo(() =>
    (Array.isArray(filteredTrucks) ? filteredTrucks : [])
    .filter(truck => truck.status === 'Ready to Plan')
    .sort((a, b) => a.deliveryDate.getTime() - b.deliveryDate.getTime()),
    [filteredTrucks]
  );

  const assignedTrucks = useMemo(() =>
    (Array.isArray(filteredTrucks) ? filteredTrucks : [])
    .filter(truck => truck.status === 'Assigned'),
    [filteredTrucks]
  );

  const partialTrucks = useMemo(() => (Array.isArray(filteredTrucks) ? filteredTrucks : []).filter(truck => truck.status === 'Partial'), [filteredTrucks]);
  const readyToFinishTrucks = useMemo(() => (Array.isArray(filteredTrucks) ? filteredTrucks : []).filter(truck => truck.status === 'Ready to Finish'), [filteredTrucks]);
  const completedTrucks = useMemo(() => (Array.isArray(filteredTrucks) ? filteredTrucks : []).filter(truck => truck.status === 'Completed'), [filteredTrucks]);

  // Debugging the final lists
  useEffect(() => {
    console.log('Dashboard Render - Trucks in each column:');
    console.log('Overdue - Missing Parts:', overdueMissingPartsTrucks.length);
    console.log('Not Ready - Missing Parts:', notReadyMissingPartsTrucks.length);
    console.log('Overdue - Ready to Plan:', overdueReadyToPlanTrucks.length);
    console.log('Ready to Plan:', readyToPlanTrucks.length);
    console.log('Assigned:', assignedTrucks.length);
    console.log('Partial:', partialTrucks.length);
    console.log('Ready to Finish:', readyToFinishTrucks.length);
    console.log('Completed:', completedTrucks.length);
  }, [
    overdueMissingPartsTrucks,
    notReadyMissingPartsTrucks,
    overdueReadyToPlanTrucks,
    readyToPlanTrucks,
    assignedTrucks,
    partialTrucks,
    readyToFinishTrucks,
    completedTrucks
  ]);


  const filteredOperators = useMemo(() => {
    if (!Array.isArray(operators)) {
      console.error('`operators` is not an array in filteredOperators useMemo:', operators);
      return [];
    }
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

      assignOperatorToTruck(selectedTruckId, selectedOperatorId);

      setIsAssignDialogOpen(false);
      setSelectedTruckId(null);
      setSelectedOperatorId(null);
      setShowRepairTimeWarning(false);
    }
  };

  const availableOperators = useMemo(() => {
    if (!selectedTruckId || !Array.isArray(trucks) || !ArrayArray.isArray(operators)) return [];
    const truckToAssign = trucks.find(t => t.id === selectedTruckId);
    if (!truckToAssign) return [];

    const neededCompetencies = getGeneralRepairTypesNeeded(truckToAssign);

    return operators.filter(op =>
      op.status === 'Available' &&
      neededCompetencies.some(comp => op.competencies.includes(comp))
    ).sort((a, b) => b.efficiency - a.efficiency);
  }, [operators, selectedTruckId, trucks]);

  const selectedOperatorAvailableHours = useMemo(() => {
    if (!selectedOperatorId || !Array.isArray(operators)) return 0;
    const operator = operators.find(op => op.id === selectedOperatorId);
    return operator ? getAvailableShiftHours(operator) : 0;
  }, [selectedOperatorId, operators]);

  const selectedTruckRepairTime = useMemo(() => {
    if (!selectedTruckId || !Array.isArray(trucks)) return 0;
    const truck = trucks.find(t => t.id === selectedTruckId);
    return truck ? truck.repairTimeEstimate : 0;
  }, [selectedTruckId, trucks]);

  const handleOpenWizard = () => {
    navigate('/operators', { state: { openWizard: true } });
  };

  const handleClearFilters = () => {
    setFilterRepairType('all');
    setFilterProjectCode('all');
    setFilterCustomerPriority('all');
    setFilterCustomer('all');
    setFilterMarket('all');
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900">Workshop Dashboard</h1>
        <Button onClick={handleOpenWizard} className="bg-blue-600 hover:bg-blue-700 text-white">
          <TruckIcon className="mr-2 h-4 w-4" /> Auto-Assign Wizard
        </Button>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label htmlFor="repairTypeFilter" className="block text-sm font-medium text-gray-700 mb-1">Repair Type</label>
          <Select value={filterRepairType} onValueChange={value => setFilterRepairType(value as RepairType | 'all')}>
            <SelectTrigger id="repairTypeFilter">
              <SelectValue placeholder="All Repair Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Repair Types</SelectItem>
              {availableRepairTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="projectCodeFilter" className="block text-sm font-medium text-gray-700 mb-1">Project Code</label>
          <Select value={filterProjectCode} onValueChange={value => setFilterProjectCode(value)}>
            <SelectTrigger id="projectCodeFilter">
              <SelectValue placeholder="All Project Codes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Project Codes</SelectItem>
              {availableProjectCodes.map(code => (
                <SelectItem key={code} value={code}>{code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="priorityFilter" className="block text-sm font-medium text-gray-700 mb-1">Customer Priority</label>
          <Select value={filterCustomerPriority} onValueChange={value => setFilterCustomerPriority(value as Truck['customerPriority'] | 'all')}>
            <SelectTrigger id="priorityFilter">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {availableCustomerPriorities.map(priority => (
                <SelectItem key={priority} value={priority}>{priority}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="customerFilter" className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
          <Select value={filterCustomer} onValueChange={value => setFilterCustomer(value)}>
            <SelectTrigger id="customerFilter">
              <SelectValue placeholder="All Customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {availableCustomerNames.map(customer => (
                <SelectItem key={customer} value={customer}>{customer}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="marketFilter" className="block text-sm font-medium text-gray-700 mb-1">Market</label>
          <Select value={filterMarket} onValueChange={value => setFilterMarket(value)}>
            <SelectTrigger id="marketFilter">
              <SelectValue placeholder="All Markets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Markets</SelectItem>
              {availableMarkets.map(market => (
                <SelectItem key={market} value={market}>{market}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={handleClearFilters} variant="outline" className="w-full">
            <FilterXIcon className="mr-2 h-4 w-4" /> Clear All Filters
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8 gap-6">
        {/* Overdue - Missing Parts Column */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2 text-gray-800 flex items-center">
            <AlertCircleIcon className="mr-2 h-5 w-5 text-red-600" /> Overdue - Not Ready ({overdueMissingPartsTrucks.length})
          </h2>
          <p className="text-sm text-muted-foreground mb-4">Priority score is 0 due to pending missing parts.</p>
          <ScrollArea className="h-[calc(100vh-400px)] pr-4">
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
            <PackageXIcon className="mr-2 h-5 w-5 text-gray-600" /> Not Ready ({notReadyMissingPartsTrucks.length})
          </h2>
          <p className="text-sm text-muted-foreground mb-4">Priority score is 0 due to pending missing parts.</p>
          <ScrollArea className="h-[calc(100vh-400px)] pr-4">
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
          <ScrollArea className="h-[calc(100vh-400px)] pr-4">
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
          <ScrollArea className="h-[calc(100vh-400px)] pr-4">
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
          <ScrollArea className="h-[calc(100vh-400px)] pr-4">
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
          <ScrollArea className="h-[calc(100vh-400px)] pr-4">
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
          <ScrollArea className="h-[calc(100vh-400px)] pr-4">
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
          <ScrollArea className="h-[calc(100vh-400px)] pr-4">
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
