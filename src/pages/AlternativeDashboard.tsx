import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Truck, RepairType, TruckStatus } from '@/types';
import TruckCard from '@/components/TruckCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStatusColor } from '@/lib/data';
import { ScrollArea } from '@/components/ui/scroll-area';

const REPAIR_TYPES: RepairType[] = ['Mechanical', 'Electrical', 'Software', 'Paint', 'Customer Adaptation'];
const TRUCK_STATUSES: TruckStatus[] = [
  'Ready to Plan',
  'Overdue - Ready to Plan',
  'Not Ready',
  'Overdue - Not Ready',
  'Assigned',
  'In Progress',
  'Partial',
  'Ready to Finish',
  'Completed',
];

const AlternativeDashboard: React.FC = () => {
  const { trucks } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepairType, setSelectedRepairType] = useState<RepairType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<TruckStatus | 'all'>('all');
  const [selectedCustomerPriority, setSelectedCustomerPriority] = useState<string | 'all'>('all');
  const [selectedProjectCode, setSelectedProjectCode] = useState<string | 'all'>('all');

  const projectCodes = useMemo(() => {
    const codes = new Set<string>();
    trucks.forEach(truck => {
      if (truck.projectCode) {
        codes.add(truck.projectCode);
      }
    });
    return Array.from(codes).sort();
  }, [trucks]);

  const filteredTrucks = useMemo(() => {
    return trucks.filter(truck => {
      const matchesSearch = truck.chassisNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRepairType = selectedRepairType === 'all' || truck.repairType === selectedRepairType;
      const matchesStatus = selectedStatus === 'all' || truck.status === selectedStatus;
      const matchesCustomerPriority = selectedCustomerPriority === 'all' || truck.customerPriority === selectedCustomerPriority;
      const matchesProjectCode = selectedProjectCode === 'all' || truck.projectCode === selectedProjectCode;

      return matchesSearch && matchesRepairType && matchesStatus && matchesCustomerPriority && matchesProjectCode;
    });
  }, [trucks, searchQuery, selectedRepairType, selectedStatus, selectedCustomerPriority, selectedProjectCode]);

  const groupedTrucks = useMemo(() => {
    const groups: Record<RepairType, Record<TruckStatus, Truck[]>> = REPAIR_TYPES.reduce((acc, type) => {
      acc[type] = TRUCK_STATUSES.reduce((statusAcc, status) => {
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
    Object.values(groups).forEach(statusGroup => {
      Object.values(statusGroup).forEach(truckList => {
        truckList.sort((a, b) => {
          // Ensure getPriorityScore is imported or defined if used here
          // For now, using a placeholder if not available
          const getPriorityScorePlaceholder = (t: Truck) => {
            // Simple placeholder logic if getPriorityScore is not imported
            let score = 0;
            if (t.customerPriority === 'Critical') score += 100;
            if (t.status === 'Overdue' || t.status === 'Overdue - Ready to Plan' || t.status === 'Overdue - Not Ready') score += 50;
            return score;
          };
          const scoreA = getPriorityScorePlaceholder(a); // Replace with actual getPriorityScore if imported
          const scoreB = getPriorityScorePlaceholder(b); // Replace with actual getPriorityScore if imported
          return scoreB - scoreA;
        });
      });
    });

    return groups;
  }, [filteredTrucks]);

  return (
    <div className="p-6 h-screen flex flex-col">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Alternative Dashboard</h1>

      <div className="flex flex-wrap gap-4 mb-6">
        <Input
          placeholder="Search by chassis number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-grow max-w-sm"
        />
        <Select onValueChange={(value: RepairType | 'all') => setSelectedRepairType(value)} value={selectedRepairType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Repair Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Repair Types</SelectItem>
            {REPAIR_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={(value: TruckStatus | 'all') => setSelectedStatus(value)} value={selectedStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {TRUCK_STATUSES.map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={(value: string | 'all') => setSelectedCustomerPriority(value)} value={selectedCustomerPriority}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by Customer Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select onValueChange={(value: string | 'all') => setSelectedProjectCode(value)} value={selectedProjectCode}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Project Code" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projectCodes.map(code => (
              <SelectItem key={code} value={code}>{code}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full w-full whitespace-nowrap rounded-md border">
          <div className="flex h-full">
            {REPAIR_TYPES.map(repairType => (
              <div key={repairType} className="flex-shrink-0 w-[calc(100vw/3 - 40px)] lg:w-[calc(100vw/5 - 40px)] xl:w-[calc(100vw/6 - 40px)] border-r last:border-r-0 p-4">
                <h2 className="text-lg font-semibold mb-4 sticky top-0 bg-white z-10 py-2">{repairType}</h2>
                <div className="space-y-6">
                  {TRUCK_STATUSES.map(status => (
                    <div key={`${repairType}-${status}`} className="pb-4">
                      <h3 className={`text-md font-medium mb-3 ${getStatusColor(status)} p-2 rounded-md`}>
                        {status} ({groupedTrucks[repairType]?.[status]?.length || 0})
                      </h3>
                      <div className="space-y-3">
                        {groupedTrucks[repairType]?.[status]?.map(truck => (
                          <TruckCard key={truck.id} truck={truck} showProjectCode={true} />
                        ))}
                        {groupedTrucks[repairType]?.[status]?.length === 0 && (
                          <p className="text-sm text-muted-foreground italic">No trucks in this status.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default AlternativeDashboard;
