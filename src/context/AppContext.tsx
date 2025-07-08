import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Truck, Operator, TruckStatus, Deviation, MissingPart } from '@/types';
import { generateTrucks, generateOperators, getPriorityScore } from '@/lib/data';
import { isPast } from 'date-fns';

interface AppContextType {
  trucks: Truck[];
  operators: Operator[];
  setTrucks: React.Dispatch<React.SetStateAction<Truck[]>>;
  setOperators: React.Dispatch<React.SetStateAction<Operator[]>>;
  prioritizedTrucks: Truck[];
  markDeviationComplete: (truckId: string, deviationId: string, completedBy: string) => boolean;
  markMissingPartComplete: (truckId: string, partId: string, completedBy: string) => void;
  markCustomerAdaptationComplete: (truckId: string, completedBy: string) => void;
  unassignOperatorFromTruck: (truckId: string, operatorId: string) => void; // Added operatorId
  assignOperatorToTruck: (truckId: string, operatorId: string) => void;
  markTruckComplete: (truckId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);

  useEffect(() => {
    setTrucks(generateTrucks(200));
    setOperators(generateOperators(12));
  }, []);

  const updatedTrucks = useMemo(() => {
    return trucks.map(truck => {
      let newStatus: TruckStatus = truck.status;

      const hasPendingMissingParts = truck.missingParts.some(
        (mp) => mp.status !== 'Available' && !mp.completed
      );
      const isCurrentlyOverdue = isPast(truck.deliveryDate, new Date());
      const customerAdaptationWorkExists = truck.customerAdaptationWork !== null;
      const customerAdaptationIsCompleted = truck.customerAdaptationCompleted;

      const totalWorkItems = truck.deviations.length + truck.missingParts.length + (customerAdaptationWorkExists ? 1 : 0);
      const completedWorkItems = truck.deviations.filter(d => d.completed).length + truck.missingParts.filter(mp => mp.completed).length + (customerAdaptationWorkExists && customerAdaptationIsCompleted ? 1 : 0);

      if (truck.status === 'Completed') {
        newStatus = 'Completed';
      }
      else if (hasPendingMissingParts) {
        if (isCurrentlyOverdue) {
          newStatus = 'Overdue - Not Ready';
        } else {
          newStatus = 'Not Ready';
        }
      }
      else if (truck.assignedOperatorIds.length > 0) { // Check if any operator is assigned
        if (completedWorkItems === totalWorkItems) {
          newStatus = 'Ready to Finish'; 
        } else if (completedWorkItems > 0) {
          newStatus = 'Partial';
        } else {
          newStatus = 'Assigned';
        }
      }
      else {
        if (isCurrentlyOverdue) {
          newStatus = 'Overdue - Ready to Plan';
        } else {
          newStatus = 'Ready to Plan';
        }
      }

      return { ...truck, status: newStatus };
    });
  }, [trucks]);

  const prioritizedTrucks = useMemo(() => {
    const readyForAssignment = updatedTrucks.filter(truck => 
      (truck.status === 'Ready to Plan' || truck.status === 'Overdue - Ready to Plan') &&
      truck.assignedOperatorIds.length === 0 // Only prioritize trucks with no assigned operators for the wizard
    );
    
    return readyForAssignment.sort((a, b) => {
      const scoreA = getPriorityScore(a).totalScore;
      const scoreB = getPriorityScore(b).totalScore;
      return scoreB - scoreA;
    });
  }, [updatedTrucks]);

  const markDeviationComplete = useCallback((truckId: string, deviationId: string, completedBy: string): boolean => {
    let success = false;
    setTrucks(prevTrucks => prevTrucks.map(truck => {
      if (truck.id === truckId) {
        if (truck.assignedOperatorIds.length === 0) { // Check if any operator is assigned
          success = false;
          return truck;
        }
        success = true;
        return {
          ...truck,
          deviations: truck.deviations.map(dev =>
            dev.id === deviationId ? { ...dev, completed: true, completedBy, completedAt: new Date() } : dev
          ),
        };
      }
      return truck;
    }));
    return success;
  }, []);

  const markMissingPartComplete = useCallback((truckId: string, partId: string, completedBy: string) => {
    setTrucks(prevTrucks => prevTrucks.map(truck =>
      truck.id === truckId
        ? {
            ...truck,
            missingParts: truck.missingParts.map(part =>
              part.id === partId ? { ...part, completed: true, completedBy, completedAt: new Date() } : part
            ),
          }
        : truck
    ));
  }, []);

  const markCustomerAdaptationComplete = useCallback((truckId: string, completedBy: string) => {
    setTrucks(prevTrucks => prevTrucks.map(truck =>
      truck.id === truckId
        ? {
            ...truck,
            customerAdaptationCompleted: true,
            customerAdaptationCompletedBy: completedBy,
            customerAdaptationCompletedAt: new Date(),
          }
        : truck
    ));
  }, []);

  const unassignOperatorFromTruck = useCallback((truckId: string, operatorId: string) => {
    setTrucks(prevTrucks => prevTrucks.map(truck => {
      if (truck.id === truckId) {
        const newAssignedOperatorIds = truck.assignedOperatorIds.filter(id => id !== operatorId);
        let newStatus = truck.status;
        if (newAssignedOperatorIds.length === 0) {
          // If no operators left, revert to Ready to Plan or Overdue - Ready to Plan
          const isCurrentlyOverdue = isPast(truck.deliveryDate, new Date());
          newStatus = isCurrentlyOverdue ? 'Overdue - Ready to Plan' : 'Ready to Plan';
        }
        return { ...truck, assignedOperatorIds: newAssignedOperatorIds, status: newStatus };
      }
      return truck;
    }));

    setOperators(prevOperators => prevOperators.map(operator => {
      if (operator.id === operatorId) {
        const newAssignedTrucks = operator.assignedTrucks.filter(t => t.id !== truckId);
        return {
          ...operator,
          assignedTrucks: newAssignedTrucks,
          status: newAssignedTrucks.length === 0 ? 'Available' : operator.status,
        };
      }
      return operator;
    }));
  }, []);

  const assignOperatorToTruck = useCallback((truckId: string, operatorId: string) => {
    setTrucks(prevTrucks =>
      prevTrucks.map(truck =>
        truck.id === truckId
          ? {
              ...truck,
              assignedOperatorIds: [...new Set([...truck.assignedOperatorIds, operatorId])], // Add operator, ensure uniqueness
              status: 'Assigned', // Set status to Assigned
            }
          : truck
      )
    );

    setOperators(prevOperators =>
      prevOperators.map(operator =>
        operator.id === operatorId
          ? {
              ...operator,
              assignedTrucks: [
                ...operator.assignedTrucks,
                trucks.find(t => t.id === truckId)!, // Add the truck to the operator's assigned list
              ],
              status: 'Busy', // Operator is now busy
            }
          : operator
      )
    );
  }, [trucks]);

  const markTruckComplete = useCallback((truckId: string) => {
    setTrucks(prevTrucks => prevTrucks.map(truck => {
      if (truck.id === truckId) {
        const allDeviationsCompleted = truck.deviations.every(dev => dev.completed);
        const allMissingPartsCompleted = truck.missingParts.every(mp => mp.completed);
        const customerAdaptationWorkExists = truck.customerAdaptationWork !== null;
        const customerAdaptationIsCompleted = truck.customerAdaptationCompleted;

        if (allDeviationsCompleted && allMissingPartsCompleted && (!customerAdaptationWorkExists || customerAdaptationIsCompleted)) {
          // Unassign all operators from this truck
          truck.assignedOperatorIds.forEach(opId => {
            setOperators(prevOperators => prevOperators.map(operator => {
              if (operator.id === opId) {
                const newAssignedTrucks = operator.assignedTrucks.filter(t => t.id !== truckId);
                return {
                  ...operator,
                  assignedTrucks: newAssignedTrucks,
                  status: newAssignedTrucks.length === 0 ? 'Available' : operator.status,
                };
              }
              return operator;
            }));
          });
          return { ...truck, status: 'Completed', assignedOperatorIds: [] }; // Clear assigned operators
        } else {
          console.warn(`Cannot mark truck ${truckId} complete: Not all work items are finished.`);
          return truck;
        }
      }
      return truck;
    }));
  }, []);

  const contextValue = useMemo(() => ({
    trucks: updatedTrucks,
    operators,
    setTrucks,
    setOperators,
    prioritizedTrucks,
    markDeviationComplete,
    markMissingPartComplete,
    markCustomerAdaptationComplete,
    unassignOperatorFromTruck,
    assignOperatorToTruck,
    markTruckComplete,
  }), [updatedTrucks, operators, setTrucks, setOperators, prioritizedTrucks, markDeviationComplete, markMissingPartComplete, markCustomerAdaptationComplete, unassignOperatorFromTruck, assignOperatorToTruck, markTruckComplete]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
