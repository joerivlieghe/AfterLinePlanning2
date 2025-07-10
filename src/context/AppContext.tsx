import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Truck, Operator, Deviation, MissingPart, TruckStatus } from '@/types';
import { generateTrucks, generateOperators, getPriorityScore } from '@/lib/data';
import { isPast } from 'date-fns';

interface AppContextType {
  trucks: Truck[];
  setTrucks: React.Dispatch<React.SetStateAction<Truck[]>>;
  operators: Operator[];
  setOperators: React.Dispatch<React.SetStateAction<Operator[]>>;
  prioritizedTrucks: Truck[];
  allProjectCodes: string[];
  markDeviationComplete: (truckId: string, deviationId: string, completedBy: string) => boolean;
  markMissingPartComplete: (truckId: string, partId: string, completedBy: string) => void;
  markCustomerAdaptationComplete: (truckId: string, completedBy: string) => void;
  unassignOperatorFromTruck: (truckId: string, operatorId: string) => void;
  assignOperatorToTruck: (truckId: string, operatorId: string) => void;
  markTruckComplete: (truckId: string) => void;
  addOperator: (newOperator: Operator) => void;
  updateOperator: (operatorId: string, updates: Partial<Operator>) => void;
  deleteOperator: (operatorId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);

  useEffect(() => {
    try {
      const initialTrucks = generateTrucks(200);
      const initialOperators = generateOperators(10);
      console.log('Generated initial trucks:', initialTrucks.length, initialTrucks);
      console.log('Generated initial operators:', initialOperators.length, initialOperators);
      setTrucks(initialTrucks);
      setOperators(initialOperators);
    } catch (error) {
      console.error("Error generating initial data in AppProvider:", error);
    }
  }, []);

  const recalculateTruckStatus = useCallback((currentTruck: Truck): TruckStatus => {
    console.log(`--- Recalculating status for Truck: ${currentTruck.chassisNumber} (ID: ${currentTruck.id}) ---`);
    console.log(`Current status before recalculation: ${currentTruck.status}`);

    const hasPendingMissingParts = currentTruck.missingParts.some(
      (mp) => mp.status !== 'Available' && !mp.completed
    );
    const allDeviationsCompleted = currentTruck.deviations.every(dev => dev.completed);
    const allAvailableMissingPartsCompleted = currentTruck.missingParts
      .filter(mp => mp.status === 'Available')
      .every(mp => mp.completed);
    const customerAdaptationCompleted = currentTruck.customerAdaptationWork === null || currentTruck.customerAdaptationCompleted;

    const allWorkItemsCompleted = allDeviationsCompleted && allAvailableMissingPartsCompleted && customerAdaptationCompleted;

    const anyDeviationCompleted = currentTruck.deviations.some(dev => dev.completed);
    const anyAvailableMissingPartCompleted = currentTruck.missingParts.some(mp => mp.status === 'Available' && mp.completed);
    const anyCustomerAdaptationCompleted = currentTruck.customerAdaptationWork !== null && currentTruck.customerAdaptationCompleted;
    const anyWorkStarted = anyDeviationCompleted || anyAvailableMissingPartCompleted || anyCustomerAdaptationCompleted;

    console.log(`  hasPendingMissingParts: ${hasPendingMissingParts}`);
    console.log(`  allDeviationsCompleted: ${allDeviationsCompleted}`);
    console.log(`  allAvailableMissingPartsCompleted: ${allAvailableMissingPartsCompleted}`);
    console.log(`  customerAdaptationCompleted: ${customerAdaptationCompleted}`);
    console.log(`  allWorkItemsCompleted: ${allWorkItemsCompleted}`);
    console.log(`  anyWorkStarted (anyDeviationCompleted || anyAvailableMissingPartCompleted || anyCustomerAdaptationCompleted): ${anyWorkStarted}`);
    console.log(`  assignedOperatorIds.length: ${currentTruck.assignedOperatorIds.length}`);

    // If the truck is already completed, keep it completed.
    if (currentTruck.status === 'Completed') {
      console.log('  -> Status: Completed (already completed)');
      return 'Completed';
    }

    // If all work items are completed, it's ready to finish.
    if (allWorkItemsCompleted) {
      console.log('  -> Status: Ready to Finish (all work items completed)');
      return 'Ready to Finish';
    }

    // If there are pending missing parts that are not available, it's 'Not Ready' or 'Overdue - Not Ready'
    if (hasPendingMissingParts) {
      const isOverdue = isPast(currentTruck.deliveryDate, new Date());
      const newStatus = isOverdue ? 'Overdue - Not Ready' : 'Not Ready';
      console.log(`  -> Status: ${newStatus} (pending missing parts)`);
      return newStatus;
    }

    // If any work is done (deviations, available missing parts, customer adaptation)
    // and it's not already 'Completed', 'Ready to Finish', or 'Not Ready'
    if (anyWorkStarted) {
      // If work has started, it's considered 'Partial' regardless of operator assignment
      console.log('  -> Status: Partial (work started, treated as partial)');
      return 'Partial';
    }

    // If no work is done, and no pending missing parts
    // If assigned to an operator, it's 'Assigned'
    if (currentTruck.assignedOperatorIds.length > 0) {
      console.log('  -> Status: Assigned (assigned, no work started)');
      return 'Assigned';
    }

    // If no work is done, no pending missing parts, and no operators assigned, it's 'Ready to Plan'
    const isOverdue = isPast(currentTruck.deliveryDate, new Date());
    const newStatus = isOverdue ? 'Overdue - Ready to Plan' : 'Ready to Plan';
    console.log(`  -> Status: ${newStatus} (no work, no pending parts, not assigned)`);
    return newStatus;
  }, []);

  const prioritizedTrucks = useMemo(() => {
    const eligibleTrucks = trucks.filter(truck =>
      truck.status !== 'Overdue - Not Ready' &&
      truck.status !== 'Not Ready'
    );

    return [...eligibleTrucks].sort((a, b) => {
      const scoreA = getPriorityScore(a).totalScore;
      const scoreB = getPriorityScore(b).totalScore;
      return scoreB - scoreA;
    });
  }, [trucks]);

  const allProjectCodes = useMemo(() => {
    const codes = new Set<string>();
    trucks.forEach(truck => {
      if (truck.projectCode) {
        codes.add(truck.projectCode);
      }
    });
    return Array.from(codes).sort();
  }, [trucks]);

  const markDeviationComplete = useCallback((truckId: string, deviationId: string, completedBy: string) => {
    let success = false;
    setTrucks(prevTrucks => prevTrucks.map(truck => {
      if (truck.id === truckId) {
        const updatedDeviations = truck.deviations.map(dev => {
          if (dev.id === deviationId && !dev.completed) {
            success = true;
            return { ...dev, completed: true, completedAt: new Date(), completedBy };
          }
          return dev;
        });
        const updatedTruck = { ...truck, deviations: updatedDeviations };
        return { ...updatedTruck, status: recalculateTruckStatus(updatedTruck) };
      }
      return truck;
    }));
    return success;
  }, [recalculateTruckStatus]);

  const markMissingPartComplete = useCallback((truckId: string, partId: string, completedBy: string) => {
    setTrucks(prevTrucks => prevTrucks.map(truck => {
      if (truck.id === truckId) {
        const updatedMissingParts = truck.missingParts.map(part => {
          if (part.id === partId && !part.completed) {
            return { ...part, completed: true, completedAt: new Date(), completedBy };
          }
          return part;
        });
        const updatedTruck = { ...truck, missingParts: updatedMissingParts };
        return { ...updatedTruck, status: recalculateTruckStatus(updatedTruck) };
      }
      return truck;
    }));
  }, [recalculateTruckStatus]);

  const markCustomerAdaptationComplete = useCallback((truckId: string, completedBy: string) => {
    setTrucks(prevTrucks => prevTrucks.map(truck => {
      if (truck.id === truckId && truck.customerAdaptationWork && !truck.customerAdaptationCompleted) {
        const updatedTruck = { ...truck, customerAdaptationCompleted: true, customerAdaptationCompletedAt: new Date(), customerAdaptationCompletedBy: completedBy };
        return { ...updatedTruck, status: recalculateTruckStatus(updatedTruck) };
      }
      return truck;
    }));
  }, [recalculateTruckStatus]);

  const unassignOperatorFromTruck = useCallback((truckId: string, operatorId: string) => {
    setTrucks(prevTrucks => prevTrucks.map(truck => {
      if (truck.id === truckId) {
        const updatedAssignedOperatorIds = truck.assignedOperatorIds.filter(id => id !== operatorId);
        const updatedTruck = { ...truck, assignedOperatorIds: updatedAssignedOperatorIds };
        return { ...updatedTruck, status: recalculateTruckStatus(updatedTruck) };
      }
      return truck;
    }));

    setOperators(prevOperators => prevOperators.map(operator => {
      if (operator.id === operatorId) {
        const updatedAssignedTrucks = operator.assignedTrucks.filter(truck => truck.id !== truckId);
        return {
          ...operator,
          assignedTrucks: updatedAssignedTrucks,
          status: updatedAssignedTrucks.length === 0 ? 'Available' : 'Busy',
        };
      }
      return operator;
    }));
  }, [recalculateTruckStatus]);

  const assignOperatorToTruck = useCallback((truckId: string, operatorId: string) => {
    setTrucks(prevTrucks =>
      prevTrucks.map(truck => {
        if (truck.id === truckId && !truck.assignedOperatorIds.includes(operatorId)) {
          const updatedTruck = { ...truck, assignedOperatorIds: [...truck.assignedOperatorIds, operatorId] };
          return { ...updatedTruck, status: recalculateTruckStatus(updatedTruck) };
        }
        return truck;
      })
    );

    setOperators(prevOperators =>
      prevOperators.map(operator => {
        if (operator.id === operatorId) {
          const truckToAssign = trucks.find(t => t.id === truckId);
          if (truckToAssign && !operator.assignedTrucks.some(t => t.id === truckId)) {
            return {
              ...operator,
              assignedTrucks: [...operator.assignedTrucks, truckToAssign],
              status: 'Busy',
            };
          }
        }
        return operator;
      })
    );
  }, [trucks, recalculateTruckStatus]);

  const markTruckComplete = useCallback((truckId: string) => {
    setTrucks(prevTrucks => prevTrucks.map(truck => {
      if (truck.id === truckId) {
        // Unassign all operators from this truck
        truck.assignedOperatorIds.forEach(operatorId => {
          setOperators(prevOperators => prevOperators.map(operator => {
            if (operator.id === operatorId) {
              const updatedAssignedTrucks = operator.assignedTrucks.filter(t => t.id !== truckId);
              return {
                ...operator,
                assignedTrucks: updatedAssignedTrucks,
                status: updatedAssignedTrucks.length === 0 ? 'Available' : 'Busy',
              };
            }
            return operator;
          }));
        });
        return { ...truck, status: 'Completed', assignedOperatorIds: [] };
      }
      return truck;
    }));
  }, []);

  const addOperator = useCallback((newOperator: Operator) => {
    setOperators(prevOperators => [...prevOperators, newOperator]);
  }, []);

  const updateOperator = useCallback((operatorId: string, updates: Partial<Operator>) => {
    setOperators(prevOperators =>
      prevOperators.map(op =>
        op.id === operatorId ? { ...op, ...updates } : op
      )
    );
  }, []);

  const deleteOperator = useCallback((operatorId: string) => {
    setOperators(prevOperators => prevOperators.filter(op => op.id !== operatorId));
    // Also unassign this operator from any trucks they might be assigned to
    setTrucks(prevTrucks => prevTrucks.map(truck => {
      const updatedTruck = {
        ...truck,
        assignedOperatorIds: truck.assignedOperatorIds.filter(id => id !== operatorId),
      };
      return { ...updatedTruck, status: recalculateTruckStatus(updatedTruck) };
    }));
  }, [recalculateTruckStatus]);

  const contextValue = useMemo(() => ({
    trucks,
    setTrucks,
    operators,
    setOperators,
    prioritizedTrucks,
    allProjectCodes,
    markDeviationComplete,
    markMissingPartComplete,
    markCustomerAdaptationComplete,
    unassignOperatorFromTruck,
    assignOperatorToTruck,
    markTruckComplete,
    addOperator,
    updateOperator,
    deleteOperator,
  }), [
    trucks,
    setTrucks,
    operators,
    setOperators,
    prioritizedTrucks,
    allProjectCodes,
    markDeviationComplete,
    markMissingPartComplete,
    markCustomerAdaptationComplete,
    unassignOperatorFromTruck,
    assignOperatorToTruck,
    markTruckComplete,
    addOperator,
    updateOperator,
    deleteOperator,
    recalculateTruckStatus,
  ]);

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
