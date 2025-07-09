import React from 'react';
import { Truck, Deviation, MissingPart, TruckStatus } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPriorityColor, getStatusColor, getSeverityColor, getMissingPartStatusColor, formatDate, calculateRemainingRepairTime, getPriorityScore } from '@/lib/data';
import { TruckIcon, WrenchIcon, PackageIcon, CalendarIcon, AlertCircleIcon, ClockIcon, InfoIcon, CheckCircleIcon, XCircleIcon, CodeIcon, UsersIcon } from 'lucide-react';

interface TruckCardProps {
  truck: Truck;
  onClick?: (truckId: string) => void;
  isSelected?: boolean;
  showProjectCode?: boolean;
}

const TruckCard: React.FC<TruckCardProps> = ({ truck, onClick, isSelected, showProjectCode = false }) => {
  const priorityScore = truck.status === 'Overdue - Not Ready' || truck.status === 'Not Ready' ? 0 : getPriorityScore(truck).totalScore;
  const remainingRepairTime = calculateRemainingRepairTime(truck);

  return (
    <Card
      className={`w-full bg-white shadow-lg rounded-lg overflow-hidden transform transition-transform hover:scale-[1.02] hover:shadow-xl cursor-pointer ${
        isSelected ? 'border-2 border-blue-500 ring-2 ring-blue-500' : ''
      }`}
      onClick={() => onClick && onClick(truck.id)}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
            <TruckIcon className="mr-2 h-5 w-5 text-primary" /> {truck.chassisNumber}
          </CardTitle>
          <Badge className={getStatusColor(truck.status)}>{truck.status}</Badge>
        </div>
        <CardDescription className="text-sm text-gray-600">
          {truck.repairType} - {truck.repairAreaNeeded}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2 text-gray-700">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center">
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Delivery: {formatDate(truck.deliveryDate)}</span>
          </div>
          <Badge className={getPriorityColor(priorityScore)}>
            P-Score: {priorityScore}
          </Badge>
        </div>
        <div className="flex items-center text-sm">
          <ClockIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>Remaining Repair Time: <span className="font-semibold">{remainingRepairTime.toFixed(1)} hrs</span></span>
        </div>
        <div className="flex items-center text-sm">
          {truck.okToDrive ? (
            <CheckCircleIcon className="mr-2 h-4 w-4 text-green-500" />
          ) : (
            <XCircleIcon className="mr-2 h-4 w-4 text-red-500" />
          )}
          <span>{truck.okToDrive ? 'OK to Drive' : 'Not OK to Drive'}</span>
        </div>
        <div className="flex items-center text-sm">
          <InfoIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>Customer Priority: <span className="font-semibold">{truck.customerPriority}</span></span>
        </div>
        {showProjectCode && truck.projectCode && (
          <div className="flex items-center text-sm">
            <CodeIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Project Code: <span className="font-semibold">{truck.projectCode}</span></span>
          </div>
        )}
        {truck.assignedOperatorIds.length > 0 && (
          <div className="flex items-center text-sm">
            <UsersIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Assigned Operators: {truck.assignedOperatorIds.length}</span>
          </div>
        )}

        {truck.deviations.filter(d => !d.completed).length > 0 && (
          <div className="mt-2">
            <h3 className="font-semibold text-sm mb-1 flex items-center">
              <AlertCircleIcon className="mr-2 h-4 w-4" /> Deviations ({truck.deviations.filter(d => !d.completed).length}):
            </h3>
            <ul className="text-xs space-y-1">
              {truck.deviations.filter(d => !d.completed).slice(0, 2).map((dev: Deviation) => (
                <li key={dev.id} className="flex items-center">
                  <span className={`mr-1 ${getSeverityColor(dev.severity)}`}>●</span>
                  {dev.description} ({dev.timeEstimate || 0}h)
                </li>
              ))}
              {truck.deviations.filter(d => !d.completed).length > 2 && (
                <li className="text-xs text-muted-foreground">
                  +{truck.deviations.filter(d => !d.completed).length - 2} more deviations
                </li>
              )}
            </ul>
          </div>
        )}

        {truck.missingParts.filter(mp => !mp.completed).length > 0 && (
          <div className="mt-2">
            <h3 className="font-semibold text-sm mb-1 flex items-center">
              <PackageIcon className="mr-2 h-4 w-4" /> Missing Parts ({truck.missingParts.filter(mp => !mp.completed).length}):
            </h3>
            <ul className="text-xs space-y-1">
              {truck.missingParts.filter(mp => !mp.completed).slice(0, 2).map((part: MissingPart) => (
                <li key={part.id} className="flex items-center">
                  <span className={`mr-1 ${getMissingPartStatusColor(part.status)} rounded-full w-2 h-2`}></span>
                  {part.name} ({part.status})
                </li>
              ))}
              {truck.missingParts.filter(mp => !mp.completed).length > 2 && (
                <li className="text-xs text-muted-foreground">
                  +{truck.missingParts.filter(mp => !mp.completed).length - 2} more parts
                </li>
              )}
            </ul>
          </div>
        )}

        {truck.customerAdaptationWork && !truck.customerAdaptationCompleted && (
          <div className="mt-2">
            <h3 className="font-semibold text-sm mb-1 flex items-center">
              <WrenchIcon className="mr-2 h-4 w-4" /> Customer Adaptation:
            </h3>
            <p className="text-xs">{truck.customerAdaptationWork} ({truck.customerAdaptationTimeEstimate || 0}h)</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TruckCard;
