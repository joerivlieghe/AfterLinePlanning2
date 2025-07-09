import React, { useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import TruckCard from '@/components/TruckCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Truck, RepairType, TruckStatus } from '@/types';
import { getPriorityScore, getStatusColor, REPAIR_TYPES } from '@/lib/data';
import { WrenchIcon, TruckIcon, AlertCircleIcon, ClockIcon, UserPlusIcon, PackageXIcon, CheckCircleIcon } from 'lucide-react';

const ALL_TRUCK_STATUSES: TruckStatus[] = [
  'Overdue - Not Ready',
  'Not Ready',
  'Overdue - Ready to Plan',
  'Ready to Plan',
  'Assigned',
  'Partial',
  'Ready to Finish',
  'Completed',
];

const AlternativeDashboard: React.FC = () => {
  const { trucks } = useAppContext();

  const groupedTrucks = useMemo(() => {
    const groups: Record<RepairType, Record<TruckStatus, Truck[]>> = REPAIR_TYPES.reduce((acc, type) => {
      acc[type] = ALL_TRUCK_STATUSES.reduce((statusAcc, status) => {
        statusAcc[status] = [];
        return statusAcc;
      }, {} as Record<TruckStatus, Truck[]>);
      return acc;
    }, {} as Record<RepairType, Record<TruckStatus, Truck[]>>);

    trucks.forEach(truck => {
      if (groups[truck.repairType]) {
        if (groups[truck.repairType][truck.status]) {
          groups[truck.repairType][truck.status].push(truck);
        }
      }
    });

    // Sort trucks within each status column by priority
    for (const repairType in groups) {
      for (const status in groups[repairType]) {
        groups[repairType][status].sort((a, b) => {
          const scoreA = getPriorityScore(a).totalScore;
          const scoreB = getPriorityScore(b).totalScore;
          return scoreB - scoreA; // Descending priority
        });
      }
    }

    return groups;
  }, [trucks]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-8">Alternative Workshop View</h1>
      <p className="text-lg text-gray-700 mb-8">Organized by Repair Type (horizontal swimlanes) and Status (vertical columns), sorted by priority.</p>

      <div className="flex flex-col space-y-8">
        {REPAIR_TYPES.map(repairType => (
          <Card key={repairType} className="shadow-lg bg-white p-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-gray-800 flex items-center">
                <WrenchIcon className="mr-3 h-6 w-6 text-blue-700" /> {repairType}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="flex space-x-6 pb-4"> {/* Horizontal scroll for columns */}
                {ALL_TRUCK_STATUSES.map(status => {
                  const trucksInColumn = groupedTrucks[repairType]?.[status] || [];
                  let IconComponent;
                  switch (status) {
                    case 'Overdue - Not Ready':
                    case 'Overdue - Ready to Plan':
                      IconComponent = AlertCircleIcon;
                      break;
                    case 'Not Ready':
                    case 'Missing Parts Not Available':
                      IconComponent = PackageXIcon;
                      break;
                    case 'Ready to Plan':
                      IconComponent = ClockIcon;
                      break;
                    case 'Assigned':
                      IconComponent = UserPlusIcon;
                      break;
                    case 'Partial':
                    case 'Ready to Finish':
                      IconComponent = WrenchIcon;
                      break;
                    case 'Completed':
                      IconComponent = CheckCircleIcon;
                      break;
                    default:
                      IconComponent = TruckIcon;
                  }

                  return (
                    <div key={status} className="flex-shrink-0 w-80 bg-gray-100 rounded-lg shadow-inner p-4">
                      <h3 className={`text-lg font-semibold mb-4 flex items-center ${getStatusColor(status).includes('text-') ? getStatusColor(status) : 'text-gray-800'}`}>
                        {IconComponent && <IconComponent className="mr-2 h-5 w-5" />} {status} ({trucksInColumn.length})
                      </h3>
                      <ScrollArea className="h-[calc(100vh-350px)] pr-4"> {/* Adjust height as needed */}
                        <div className="space-y-4">
                          {trucksInColumn.length > 0 ? (
                            trucksInColumn.map(truck => (
                              <TruckCard key={truck.id} truck={truck} />
                            ))
                          ) : (
                            <p className="text-muted-foreground text-center py-8 text-sm">No trucks in this status.</p>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AlternativeDashboard;
