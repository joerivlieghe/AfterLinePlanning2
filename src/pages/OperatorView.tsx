import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import TruckCard from '@/components/TruckCard';
import { getStatusColor, getEfficiencyColor, formatTime, formatDate } from '@/lib/data';
import { ArrowLeftIcon, UserIcon, WrenchIcon, ClockIcon, InfoIcon, CalendarIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react';

const OperatorView: React.FC = () => {
  const { operatorId } = useParams<{ operatorId: string }>();
  const navigate = useNavigate();
  const { operators, trucks } = useAppContext();

  const operator = useMemo(() => operators.find(op => op.id === operatorId), [operators, operatorId]);

  const assignedTrucks = useMemo(() => {
    if (!operator) return [];
    return trucks.filter(truck => operator.assignedTruckIds.includes(truck.id));
  }, [trucks, operator]);

  if (!operator) {
    return (
      <div className="p-6 text-center text-red-500">
        <h1 className="text-2xl font-bold">Operator Not Found</h1>
        <Button onClick={() => navigate('/operators')} className="mt-4">
          Back to Operators
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col h-screen">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mr-4">
          <ArrowLeftIcon className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Operator: {operator.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-1 bg-white shadow-lg rounded-lg">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xl font-semibold flex items-center">
              <UserIcon className="mr-2 h-6 w-6 text-primary" /> Operator Details
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Information about {operator.name}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2 text-gray-700">
            <div className="flex items-center text-base">
              <Badge className={getStatusColor(operator.status)}>{operator.status}</Badge>
            </div>
            <div className="flex items-center text-base">
              <ClockIcon className="mr-2 h-5 w-5 text-muted-foreground" />
              <span>Shift: {formatTime(operator.shiftStartTime)} - {formatTime(operator.shiftEndTime)} ({operator.shift})</span>
            </div>
            <div className="flex items-center text-base">
              <InfoIcon className="mr-2 h-5 w-5 text-muted-foreground" />
              <span>Efficiency: <span className={`font-semibold ${getEfficiencyColor(operator.efficiency)}`}>{(operator.efficiency * 100).toFixed(0)}%</span></span>
            </div>
            <div className="mt-4">
              <h3 className="font-semibold text-base flex items-center mb-2">
                <WrenchIcon className="mr-2 h-5 w-5 text-muted-foreground" /> Competencies:
              </h3>
              <div className="flex flex-wrap gap-2">
                {operator.competencies.map((comp, idx) => (
                  <Badge key={idx} variant="secondary">{comp}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-white shadow-lg rounded-lg">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xl font-semibold flex items-center">
              <TruckIcon className="mr-2 h-6 w-6 text-primary" /> Assigned Trucks ({assignedTrucks.length})
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Trucks currently assigned to {operator.name}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {assignedTrucks.length > 0 ? (
                  assignedTrucks.map(truck => (
                    <TruckCard key={truck.id} truck={truck} onClick={() => navigate(`/trucks/${truck.id}`)} />
                  ))
                ) : (
                  <p className="text-muted-foreground italic">No trucks currently assigned to this operator.</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OperatorView;
