import React from 'react';
import { Truck } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getPriorityColor, getStatusColor, formatDate, getPriorityScore } from '@/lib/data';
import { WrenchIcon, PackageIcon, CalendarIcon, InfoIcon, ArrowRightIcon, StarIcon, ClockIcon, UsersIcon, PaletteIcon, SettingsIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TruckCardProps {
  truck: Truck;
  onAssignClick?: (truckId: string) => void;
}

const TruckCard: React.FC<TruckCardProps> = ({ truck, onAssignClick }) => {
  const navigate = useNavigate();
  const priorityScore = getPriorityScore(truck).totalScore;
  
  const openDeviations = truck.deviations.filter(dev => !dev.completed).length;
  const pendingMissingParts = truck.missingParts.filter(mp => mp.status !== 'Available' && !mp.completed).length;

  const handleCardClick = () => {
    navigate(`/trucks/${truck.id}`);
  };

  const showAssignButton = truck.status === 'Ready to Plan' || truck.status === 'Overdue - Ready to Plan';

  return (
    <Card className="w-full cursor-pointer hover:shadow-lg transition-shadow duration-200" onClick={handleCardClick}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{truck.chassisNumber}</CardTitle>
          <Badge className={getStatusColor(truck.status)}>{truck.status}</Badge>
        </div>
        <CardDescription className="text-sm text-gray-600">ID: {truck.id}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Delivery: {formatDate(truck.deliveryDate)}</span>
          </div>
          <Badge className={getPriorityColor(priorityScore)}><StarIcon className="inline-block h-3 w-3 mr-1" /> {priorityScore}</Badge>
        </div>
        <div className="flex items-center">
          <WrenchIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>Repair Type: {truck.repairType}</span>
        </div>
        {truck.projectCode && (
          <div className="flex items-center">
            <InfoIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Project Code: {truck.projectCode}</span>
          </div>
        )}
        
        {truck.deviationTimeEstimate !== undefined && truck.deviationTimeEstimate > 0 && (
          <div className="flex items-center text-yellow-700">
            <ClockIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Deviations Est. Time: {truck.deviationTimeEstimate} hrs</span>
          </div>
        )}
        {truck.missingPartsTimeEstimate !== undefined && truck.missingPartsTimeEstimate > 0 && (
          <div className="flex items-center text-blue-700">
            <ClockIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Missing Parts Est. Time: {truck.missingPartsTimeEstimate} hrs</span>
          </div>
        )}
        {truck.customerAdaptationWork && truck.customerAdaptationTimeEstimate !== undefined && truck.customerAdaptationTimeEstimate > 0 && (
          <div className="flex items-center text-purple-700">
            <ClockIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>CA Work Est. Time: {truck.customerAdaptationTimeEstimate} hrs</span>
          </div>
        )}
        {truck.repairTimeEstimate > 0 && (
          <div className="flex items-center font-semibold text-gray-800">
            <ClockIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Total Est. Repair Time: {truck.repairTimeEstimate} hrs</span>
          </div>
        )}

        {openDeviations > 0 && (
          <div className="flex items-center text-red-600">
            <WrenchIcon className="mr-2 h-4 w-4" />
            <span>{openDeviations} Open Deviation{openDeviations > 1 ? 's' : ''}</span>
          </div>
        )}
        {pendingMissingParts > 0 && (
          <div className="flex items-center text-orange-600">
            <PackageIcon className="mr-2 h-4 w-4" />
            <span>{pendingMissingParts} Pending Part{pendingMissingParts > 1 ? 's' : ''}</span>
          </div>
        )}
        {truck.customerAdaptationWork && (
          <div className="flex items-center text-purple-600">
            {truck.customerAdaptationType === 'Paint' ? (
              <PaletteIcon className="mr-2 h-4 w-4" />
            ) : truck.customerAdaptationType === 'Mechanical' ? (
              <WrenchIcon className="mr-2 h-4 w-4" />
            ) : (
              <SettingsIcon className="mr-2 h-4 w-4" />
            )}
            <span>Customer Adaptation: {truck.customerAdaptationType || 'General'}</span>
          </div>
        )}
        {truck.customerAdaptationType === 'Paint' && truck.paintDetails && (
          <div className="flex items-center text-purple-600 ml-6">
            <span className="text-xs text-muted-foreground">Color: {truck.paintDetails.color}, Booth: {truck.paintDetails.paintBoothType}</span>
          </div>
        )}
        {truck.assignedOperatorIds.length > 0 && (
          <div className="flex items-center text-blue-600">
            <UsersIcon className="mr-2 h-4 w-4" />
            <span>Assigned to {truck.assignedOperatorIds.length} operator{truck.assignedOperatorIds.length > 1 ? 's' : ''}</span>
          </div>
        )}
        {showAssignButton && onAssignClick && (
          <Button
            className="w-full mt-3"
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click from navigating
              onAssignClick(truck.id);
            }}
          >
            Assign to Operator <ArrowRightIcon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default TruckCard;
