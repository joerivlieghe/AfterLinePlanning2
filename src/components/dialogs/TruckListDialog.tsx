import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Truck } from '@/types';
import { getStatusColor, formatDate, getPriorityColor, getPriorityScore } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EyeIcon } from 'lucide-react';

interface TruckListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  trucks: Truck[];
}

const TruckListDialog: React.FC<TruckListDialogProps> = ({ isOpen, onClose, title, description, trucks }) => {
  const navigate = useNavigate();

  const handleRowClick = (truckId: string) => {
    onClose(); // Close the dialog before navigating
    navigate(`/trucks/${truckId}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <ScrollArea className="flex-1 py-4 pr-4">
          {trucks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chassis Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Repair Type</TableHead>
                  <TableHead>Est. Hours</TableHead>
                  <TableHead className="text-center">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trucks.map((truck) => (
                  <TableRow key={truck.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleRowClick(truck.id)}>
                    <TableCell className="font-medium">{truck.chassisNumber}</TableCell>
                    <TableCell><Badge className={getStatusColor(truck.status)}>{truck.status}</Badge></TableCell>
                    <TableCell>{formatDate(truck.deliveryDate)}</TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(getPriorityScore(truck).totalScore)}>
                        {getPriorityScore(truck).totalScore}
                      </Badge>
                    </TableCell>
                    <TableCell>{truck.repairType}</TableCell>
                    <TableCell>{truck.repairTimeEstimate} hrs</TableCell>
                    <TableCell className="text-center">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleRowClick(truck.id); }}>
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">No trucks found for this category.</p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default TruckListDialog;
