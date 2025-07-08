import React from 'react';
import { Operator } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getStatusColor, getEfficiencyColor, formatTime, getAvailableShiftHours } from '@/lib/data';
import { WrenchIcon, ClockIcon, GaugeIcon, TruckIcon, InfoIcon, UsersIcon } from 'lucide-react'; // Added UsersIcon

interface OperatorCardProps {
  operator: Operator;
  onClick?: (operatorId: string) => void;
  isSelected?: boolean;
}

const OperatorCard: React.FC<OperatorCardProps> = ({ operator, onClick, isSelected }) => {
  const availableHours = getAvailableShiftHours(operator);
  const assignedRepairTime = operator.assignedTrucks.reduce((sum, truck) => sum + truck.repairTimeEstimate, 0);
  const totalShiftHours = (operator.shiftEndTime.getTime() - operator.shiftStartTime.getTime()) / (1000 * 60 * 60);
  const occupancyRate = totalShiftHours > 0 ? (assignedRepairTime / totalShiftHours) : 0;

  return (
    <Card
      className={`w-full bg-white shadow-lg rounded-lg overflow-hidden transform transition-transform hover:scale-[1.02] hover:shadow-xl cursor-pointer ${
        isSelected ? 'border-2 border-blue-500 ring-2 ring-blue-500' : ''
      }`}
      onClick={() => onClick && onClick(operator.id)}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
            <UsersIcon className="mr-2 h-5 w-5 text-primary" /> {operator.name}
          </CardTitle>
          <Badge className={getStatusColor(operator.status)}>{operator.status}</Badge>
        </div>
        <CardDescription className="text-sm text-gray-600">ID: {operator.id}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2 text-gray-700">
        <div className="flex items-center text-sm">
          <Badge variant="outline" className="text-xs px-2 py-0.5">
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
          <h5 className="font-semibold text-sm mb-1 flex items-center">
            <WrenchIcon className="mr-2 h-4 w-4" /> Competencies:
          </h5>
          <div className="flex flex-wrap gap-1">
            {operator.competencies.slice(0, 3).map((comp, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {comp}
              </Badge>
            ))}
            {operator.competencies.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{operator.competencies.length - 3} more
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OperatorCard;
