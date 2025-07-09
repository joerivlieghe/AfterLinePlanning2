import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Operator } from '@/types';
import { getStatusColor } from '@/lib/data';
import { Badge } from '@/components/ui/badge';

interface OperatorListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  operators: Operator[];
}

const OperatorListDialog: React.FC<OperatorListDialogProps> = ({ isOpen, onClose, title, description, operators }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <ScrollArea className="flex-1 py-4 pr-4">
          {operators.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Competencies</TableHead>
                  <TableHead>Assigned Trucks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operators.map((operator) => (
                  <TableRow key={operator.id}>
                    <TableCell className="font-medium">{operator.name}</TableCell>
                    <TableCell><Badge className={getStatusColor(operator.status)}>{operator.status}</Badge></TableCell>
                    <TableCell>{operator.shift}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {operator.competencies.map((comp, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs px-2 py-0.5">
                            {comp}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{operator.assignedTrucks.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">No operators found for this category.</p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default OperatorListDialog;
