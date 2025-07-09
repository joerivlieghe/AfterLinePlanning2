import React, { useMemo, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Truck, RepairType, TruckStatus } from '@/types';
import TruckCard from '@/components/TruckCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchIcon, FilterIcon, CodeIcon, CalendarIcon, InfoIcon } from 'lucide-react';
import { REPAIR_TYPES, CUSTOMER_PRIORITIES, getPriorityScore } from '@/lib/data';
import { format } from 'date-fns';

const ALL_TRUCK_STATUSES: TruckStatus[] = [
  'Pending', 'In Progress', 'Partial', 'Completed', 'Overdue',
  'Missing Parts Not Available', 'Assigned', 'Ready to Finish',
  'Overdue - Not Ready', 'Not Ready', 'Overdue - Ready to Plan', 'Ready to Plan'
];

const AlternativeDashboard: React.FC = () => {
  const { trucks, allProjectCodes } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRepairType, setFilterRepairType] = useState<RepairType | 'All'>('All');
  const [filterProjectCode, setFilterProjectCode] = useState<string | 'All'>('All');
  const [filterStatus, setFilterStatus] = useState<TruckStatus | 'All'>('All');
  const [filterCustomerPriority, setFilterCustomerPriority] = useState<Truck['customerPriority'] | 'All'>('All');

  const filteredTrucks = useMemo(() => {
    let filtered = trucks;

    if (searchTerm) {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(truck =>
        truck.chassisNumber.toLowerCase().includes(lowercasedSearchTerm) ||
        truck.projectCode?.toLowerCase().includes(lowercasedSearchTerm)
      );
    }

    if (filterRepairType !== 'All') {
      filtered = filtered.filter(truck => truck.repairType === filterRepairType);
    }

    if (filterProjectCode !== 'All') {
      filtered = filtered.filter(truck => truck.projectCode === filterProjectCode);
    }

    if (filterStatus !== 'All') {
      filtered = filtered.filter(truck => truck.status === filterStatus);
    }

    if (filterCustomerPriority !== 'All') {
      filtered = filtered.filter(truck => truck.customerPriority === filterCustomerPriority);
    }

    return filtered;
  }, [trucks, searchTerm, filterRepairType, filterProjectCode, filterStatus, filterCustomerPriority]);

  const groupedTrucks = useMemo(() => {
    const groups: Record<RepairType, Record<TruckStatus, Truck[]>> = REPAIR_TYPES.reduce((acc, type) => {
      acc[type] = ALL_TRUCK_STATUSES.reduce((statusAcc, status) => {
        statusAcc[status] = [];
        return statusAcc;
      }, {} as Record<TruckStatus, Truck[]>);
      return acc;
    }, {} as Record<RepairType, Record<TruckStatus, Truck[]>>);

    filteredTrucks.forEach(truck => {
      if (groups[truck.repairType] && groups[truck.repairType][truck.status]) {
        groups[truck.repairType][truck.status].push(truck);
      }
    });

    // Sort trucks within each status column by priority score (descending)
    for (const repairType of REPAIR_TYPES) {
      for (const status of ALL_TRUCK_STATUSES) {
        groups[repairType][status].sort((a, b) => getPriorityScore(b).totalScore - getPriorityScore(a).totalScore);
      }
    }

    return groups;
  }, [filteredTrucks]);

  return (
    <div className="p-6 flex flex-col h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Alternative Dashboard</h1>
      <p className="text-lg text-gray-700 mb-8">Visualize trucks by repair type and status, sorted by priority.</p>

      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <div className="relative flex-grow max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search by chassis or project code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-3 py-2 border rounded-md w-full"
          />
        </div>

        <Select value={filterRepairType} onValueChange={(value: RepairType | 'All') => setFilterRepairType(value)}>
          <SelectTrigger className="w-[180px]">
            <FilterIcon className="mr-2 h-4 w-4 text-gray-500" />
            <SelectValue placeholder="Filter by Repair Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Repair Types</SelectItem>
            {REPAIR_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterProjectCode} onValueChange={(value: string | 'All') => setFilterProjectCode(value)}>
          <SelectTrigger className="w-[180px]">
            <CodeIcon className="mr-2 h-4 w-4 text-gray-500" />
            <SelectValue placeholder="Filter by Project Code" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Project Codes</SelectItem>
            {allProjectCodes.map(code => (
              <SelectItem key={code} value={code}>{code}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={(value: TruckStatus | 'All') => setFilterStatus(value)}>
          <SelectTrigger className="w-[180px]">
            <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            {ALL_TRUCK_STATUSES.map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterCustomerPriority} onValueChange={(value: Truck['customerPriority'] | 'All') => setFilterCustomerPriority(value)}>
          <SelectTrigger className="w-[180px]">
            <InfoIcon className="mr-2 h-4 w-4 text-gray-500" />
            <SelectValue placeholder="Filter by Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Priorities</SelectItem>
            {CUSTOMER_PRIORITIES.map(priority => (
              <SelectItem key={priority} value={priority}>{priority}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1 whitespace-nowrap">
        <div className="inline-flex h-full space-x-6 p-2">
          {REPAIR_TYPES.map(repairType => (
            <div key={repairType} className="flex flex-col min-w-[300px] max-w-[350px] border rounded-lg shadow-md bg-gray-50 h-full">
              <h2 className="text-xl font-semibold p-4 bg-blue-100 text-blue-800 rounded-t-lg sticky top-0 z-10">{repairType}</h2>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {ALL_TRUCK_STATUSES.map(status => (
                    <div key={`${repairType}-${status}`} className="border-b pb-4 last:border-b-0 last:pb-0">
                      <h3 className="font-semibold text-md mb-2 flex items-center">
                        <span className={`inline-block w-3 h-3 rounded-full mr-2 ${getStatusColor(status).split(' ')[0].replace('bg', 'bg-')}`}></span>
                        {status} ({groupedTrucks[repairType][status]?.length || 0})
                      </h3>
                      <div className="space-y-3">
                        {groupedTrucks[repairType][status]?.length > 0 ? (
                          groupedTrucks[repairType][status].map(truck => (
                            <TruckCard key={truck.id} truck={truck} showProjectCode={true} />
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No trucks in this status.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AlternativeDashboard;
