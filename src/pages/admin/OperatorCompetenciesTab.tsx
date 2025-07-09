import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Operator, RepairType } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { PlusCircleIcon, EditIcon, Trash2Icon, SaveIcon, XIcon, UserPlusIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ScrollArea } from '@/components/ui/scroll-area';

const allRepairTypes: RepairType[] = ['Mechanical', 'Electrical', 'Software', 'Paint', 'Customer Adaptation'];

const OperatorCompetenciesTab: React.FC = () => {
  const { operators, addOperator, updateOperator, deleteOperator } = useAppContext();
  const { toast } = useToast();

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [currentOperator, setCurrentOperator] = useState<Operator | null>(null);
  const [operatorName, setOperatorName] = useState('');
  const [operatorCompetencies, setOperatorCompetencies] = useState<RepairType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const handleOpenAddDialog = () => {
    setCurrentOperator(null);
    setOperatorName('');
    setOperatorCompetencies([]);
    setIsAddEditDialogOpen(true);
  };

  const handleOpenEditDialog = (operator: Operator) => {
    setCurrentOperator(operator);
    setOperatorName(operator.name);
    setOperatorCompetencies(operator.competencies);
    setIsAddEditDialogOpen(true);
  };

  const handleSaveOperator = () => {
    if (!operatorName.trim()) {
      toast({
        title: "Validation Error",
        description: "Operator name cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    if (currentOperator) {
      // Update existing operator
      updateOperator(currentOperator.id, {
        name: operatorName.trim(),
        competencies: operatorCompetencies,
      });
      toast({
        title: "Operator Updated",
        description: `Operator "${operatorName}" has been updated.`,
      });
    } else {
      // Add new operator
      const newOperator: Operator = {
        id: uuidv4(),
        name: operatorName.trim(),
        competencies: operatorCompetencies,
        status: 'Available',
        shiftStartTime: new Date(new Date().setHours(8, 0, 0, 0)), // Default 8 AM
        shiftEndTime: new Date(new Date().setHours(17, 0, 0, 0)), // Default 5 PM
        shift: 'Early',
        assignedTrucks: [],
        efficiency: 1.0,
      };
      addOperator(newOperator);
      toast({
        title: "Operator Added",
        description: `Operator "${operatorName}" has been added.`,
      });
    }
    setIsAddEditDialogOpen(false);
  };

  const handleDeleteOperator = (operatorId: string, operatorName: string) => {
    if (window.confirm(`Are you sure you want to delete operator "${operatorName}"? This action cannot be undone.`)) {
      deleteOperator(operatorId);
      toast({
        title: "Operator Deleted",
        description: `Operator "${operatorName}" has been deleted.`,
      });
    }
  };

  const handleCompetencyChange = (type: RepairType, checked: boolean) => {
    setOperatorCompetencies(prev =>
      checked ? [...prev, type] : prev.filter(c => c !== type)
    );
  };

  const filteredOperators = operators.filter(op =>
    op.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Search operators by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleOpenAddDialog} className="bg-primary hover:bg-primary/90 text-white">
          <UserPlusIcon className="mr-2 h-4 w-4" /> Add New Operator
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-350px)] pr-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOperators.length === 0 ? (
            <p className="col-span-full text-center text-muted-foreground py-12">No operators found.</p>
          ) : (
            filteredOperators.map((operator) => (
              <Card key={operator.id} className="shadow-md hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xl font-semibold">{operator.name}</CardTitle>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(operator)}>
                      <EditIcon className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteOperator(operator.id, operator.name)}>
                      <Trash2Icon className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <CardDescription className="text-sm text-gray-600">ID: {operator.id}</CardDescription>
                  <div>
                    <h4 className="font-medium text-sm mb-1">Competencies:</h4>
                    <div className="flex flex-wrap gap-2">
                      {operator.competencies.length > 0 ? (
                        operator.competencies.map((comp, idx) => (
                          <span key={idx} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            {comp}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">No competencies assigned</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentOperator ? 'Edit Operator' : 'Add New Operator'}</DialogTitle>
            <DialogDescription>
              {currentOperator ? 'Make changes to operator details here.' : 'Create a new operator profile.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right mt-2">
                Competencies
              </Label>
              <div className="col-span-3 space-y-2">
                {allRepairTypes.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`comp-${type}`}
                      checked={operatorCompetencies.includes(type)}
                      onCheckedChange={(checked) => handleCompetencyChange(type, checked as boolean)}
                    />
                    <Label htmlFor={`comp-${type}`}>{type}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEditDialogOpen(false)}>
              <XIcon className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button onClick={handleSaveOperator}>
              <SaveIcon className="mr-2 h-4 w-4" /> {currentOperator ? 'Save Changes' : 'Add Operator'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OperatorCompetenciesTab;
