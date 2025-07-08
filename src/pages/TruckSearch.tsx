import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchIcon, TruckIcon, CalendarIcon, WrenchIcon, InfoIcon, ArrowRightIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate, getStatusColor } from '@/lib/data';

const TruckSearch: React.FC = () => {
  const { trucks } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const filteredTrucks = useMemo(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    if (!lowercasedSearchTerm) return [];

    return trucks.filter(truck =>
      truck.chassisNumber.toLowerCase().includes(lowercasedSearchTerm) ||
      truck.id.toLowerCase().includes(lowercasedSearchTerm)
    );
  }, [trucks, searchTerm]);

  const handleViewDetails = (truckId: string) => {
    navigate(`/trucks/${truckId}`);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-extrabold mb-8 text-gray-900">Truck Search</h1>

      <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center mb-4">
          <SearchIcon className="mr-3 h-6 w-6 text-gray-500" />
          <Input
            placeholder="Search trucks by Chassis Number or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow max-w-md"
          />
        </div>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 flex items-center">
          <TruckIcon className="mr-3 h-6 w-6 text-primary" /> Search Results ({filteredTrucks.length})
        </h2>
        <ScrollArea className="h-[calc(100vh-350px)] w-full pr-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTrucks.length > 0 ? (
              filteredTrucks.map(truck => (
                <Card key={truck.id} className="w-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold">{truck.chassisNumber}</CardTitle>
                      <Badge className={getStatusColor(truck.status)}>{truck.status}</Badge>
                    </div>
                    <CardDescription className="text-sm text-gray-600">ID: {truck.id}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="flex items-center">
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>Delivery: {formatDate(truck.deliveryDate)}</span>
                    </div>
                    <div className="flex items-center">
                      <WrenchIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>Repair Type: {truck.repairType} ({truck.repairTimeEstimate} hrs)</span>
                    </div>
                    <div className="flex items-center">
                      <InfoIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>Customer Priority: {truck.customerPriority}</span>
                    </div>
                    <Button
                      className="w-full mt-3"
                      onClick={() => handleViewDetails(truck.id)}
                    >
                      View Details <ArrowRightIcon className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground text-center col-span-full py-8">
                {searchTerm ? 'No trucks found matching your search criteria.' : 'Start typing to search for trucks.'}
              </p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default TruckSearch;
