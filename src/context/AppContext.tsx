import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Truck, Operator, Deviation, MissingPart, TruckStatus, RepairType } from '@/types';
import { generateTrucks, generateOperators, getPriorityScore, CUSTOMER_NAMES, EUROPEAN_MARKETS } from '@/lib/data';
import { addDays, isPast, format } from 'date-fns';

interface AppContextType {
  trucks: Truck[];
  operators: Operator[];
  prioritizedTrucks: Truck[];
  allProjectCodes: string[];
  allCustomerNames: string[]; // New
  allMarkets: string[];       // New
  markDeviationComplete: (truckId: string, deviationId: string, completedBy: string) => boolean;
  markMissingPartComplete: (truckId: string, missingPartId: string, completedBy: string) => void;
  assignOperatorToTruck: (truckId: string, operatorId: string) => void;
  unassignOperatorFromTruck: (truckId: string, operatorId: string) => void;
  markTruckComplete: (truckId: string) => void;
  markCustomerAdaptationComplete: (truckId: string, completedBy: string) => void;
  updateTruckStatus: (truckId: string, newStatus: TruckStatus) => void;
  updateOperatorStatus: (operatorId: string, newStatus: Operator['status']) => void;
  updateOperatorCompetencies: (operatorId: string, newCompetencies: RepairType[]) => void;
  addOperator: (operator: Omit<Operator, 'id' | 'assignedTrucks'>) => void;
  removeOperator: (operatorId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);

  useEffect(() => {
    // Generate initial data
    const initialTrucks = generateTrucks(250); // Changed to 250 trucks
    const initialOperators = generateOperators(20);
    setTrucks(initialTrucks);
    setOperators(initialOperators);
  }, []);

  // Memoize all unique project codes for filters
  const allProjectCodes = useMemo(() => {
    const codes = new Set<string>();
    trucks.forEach(truck => {
      if (truck.projectCode) {
        codes.add(truck.projectCode);
      }
    });
    return Array.from(codes).sort();
  }, [trucks]);

  // New: Memoize all unique customer names for filters
  const allCustomerNames = useMemo(() => {
    const names = new Set<string>();
    trucks.forEach(truck => names.add(truck.customer));
    return Array.from(names).sort();
  }, [trucks]);

  // New: Memoize all unique markets for filters
  const allMarkets = useMemo(() => {
    const markets = new Set<string>();
    trucks.forEach(truck => markets.add(truck.market));
    return Array.from(markets).sort();
  }, [trucks]);


  // Update truck status based on its state (deviations, missing parts, completion)
  const updateTruckStatusLogic = useCallback((currentTruck: Truck): TruckStatus => {
    const hasPendingMissingParts = currentTruck.missingParts.some(mp => mp.status !== 'Available' && !mp.completed);
    const hasOpenDeviations = currentTruck.deviations.some(dev => !dev.completed);
    const hasPendingCustomerAdaptation = currentTruck.customerAdaptationWork && !currentTruck.customerAdaptationCompleted;
    const hasAssignedOperators = currentTruck.assignedOperatorIds.length > 0;

    const isOverdue = isPast(currentTruck.deliveryDate, new Date());

    if (currentTruck.status === 'Completed') {
      return 'Completed';
    }

    if (hasPendingMissingParts) {
      return isOverdue ? 'Overdue - Not Ready' : 'Not Ready';
    }

    if (hasOpenDeviations || hasPendingCustomerAdaptation) {
      if (hasAssignedOperators) {
        // If there's work and operators assigned, it's in progress or partial
        // For simplicity, let's say if any work is done, it's 'Partial', otherwise 'Assigned'
        // This logic might need refinement based on actual work progress tracking
        const anyDeviationCompleted = currentTruck.deviations.some(dev => dev.completed);
        const anyMissingPartCompleted = currentTruck.missingParts.some(mp => mp.completed);
        if (anyDeviationCompleted || anyMissingPartCompleted || (currentTruck.customerAdaptationWork && currentTruck.customerAdaptationCompleted)) {
          return 'Partial';
        }
        return 'Assigned'; // Assigned but no work started yet
      }
      // If no assigned operators but work is pending
      return isOverdue ? 'Overdue - Ready to Plan' : 'Ready to Plan';
    }

    // If no pending missing parts, no open deviations, no pending CA work
    // and not yet completed, it's ready to finish
    return 'Ready to Finish';

  }, []);

  // Effect to update truck statuses whenever trucks or their sub-properties change
  useEffect(() => {
    setTrucks(prevTrucks =>
      prevTrucks.map(truck => {
        const newStatus = updateTruckStatusLogic(truck);
        if (truck.status !== newStatus) {
          return { ...truck, status: newStatus };
        }
        return truck;
      })
    );
  }, [trucks.map(t => `${t.deviations.map(d => d.completed).join()}-${t.missingParts.map(mp => mp.completed).join()}-${t.customerAdaptationCompleted}-${t.assignedOperatorIds.length}`).join(), updateTruckStatusLogic]);


  const prioritizedTrucks = useMemo(() => {
    // Filter out trucks that are 'Completed' or 'Missing Parts Not Available'
    const eligibleTrucks = trucks.filter(
      (truck) => truck.status !== 'Completed' && truck.status !== 'Missing Parts Not Available' && truck.status !== 'Not Ready' && truck.status !== 'Overdue - Not Ready'
    );

    return [...eligibleTrucks].sort((a, b) => {
      const scoreA = getPriorityScore(a).totalScore;
      const scoreB = getPriorityScore(b).totalScore;
      return scoreB - scoreA; // Higher score means higher priority
    });
  }, [trucks]);

  const markDeviationComplete = useCallback((truckId: string, deviationId: string, completedBy: string): boolean => {
    let success = false;
    setTrucks(prevTrucks =>
      prevTrucks.map(truck => {
        if (truck.id === truckId) {
          const updatedDeviations = truck.deviations.map(dev => {
            if (dev.id === deviationId && !dev.completed) {
              success = true;
              return { ...dev, completed: true, completedBy, completedAt: new Date() };
            }
            return dev;
          });
          const updatedTruck = { ...truck, deviations: updatedDeviations };
          return { ...updatedTruck, status: updateTruckStatusLogic(updatedTruck) };
        }
        return truck;
      })
    );
    return success;
  }, [updateTruckStatusLogic]);

  const markMissingPartComplete = useCallback((truckId: string, missingPartId: string, completedBy: string) => {
    setTrucks(prevTrucks =>
      prevTrucks.map(truck => {
        if (truck.id === truckId) {
          const updatedMissingParts = truck.missingParts.map(mp => {
            if (mp.id === missingPartId && !mp.completed) {
              return { ...mp, completed: true, completedBy, completedAt: new Date() };
            }
            return mp;
          });
          const updatedTruck = { ...truck, missingParts: updatedMissingParts };
          return { ...updatedTruck, status: updateTruckStatusLogic(updatedTruck) };
        }
        return truck;
      })
    );
  }, [updateTruckStatusLogic]);

  const markCustomerAdaptationComplete = useCallback((truckId: string, completedBy: string) => {
    setTrucks(prevTrucks =>
      prevTrucks.map(truck => {
        if (truck.id === truckId && truck.customerAdaptationWork && !truck.customerAdaptationCompleted) {
          const updatedTruck = { ...truck, customerAdaptationCompleted: true, customerAdaptationCompletedBy: completedBy, customerAdaptationCompletedAt: new Date() };
          return { ...updatedTruck, status: updateTruckStatusLogic(updatedTruck) };
        }
        return truck;
      })
    );
  }, [updateTruckStatusLogic]);

  const assignOperatorToTruck = useCallback((truckId: string, operatorId: string) => {
    setTrucks(prevTrucks =>
      prevTrucks.map(truck => {
        if (truck.id === truckId && !truck.assignedOperatorIds.includes(operatorId)) {
          const updatedTruck = { ...truck, assignedOperatorIds: [...truck.assignedOperatorIds, operatorId] };
          return { ...updatedTruck, status: updateTruckStatusLogic(updatedTruck) };
        }
        return truck;
      })
    );
    setOperators(prevOperators =>
      prevOperators.map(operator => {
        if (operator.id === operatorId && !operator.assignedTrucks.some(t => t.id === truckId)) {
          const truckToAssign = trucks.find(t => t.id === truckId);
          if (truckToAssign) {
            return { ...operator, assignedTrucks: [...operator.assignedTrucks, truckToAssign], status: 'Busy' };
          }
        }
        return operator;
      })
    );
  }, [trucks, updateTruckStatusLogic]);

  const unassignOperatorFromTruck = useCallback((truckId: string, operatorId: string) => {
    setTrucks(prevTrucks =>
      prevTrucks.map(truck => {
        if (truck.id === truckId) {
          const updatedTruck = { ...truck, assignedOperatorIds: truck.assignedOperatorIds.filter(id => id !== operatorId) };
          return { ...updatedTruck, status: updateTruckStatusLogic(updatedTruck) };
        }
        return truck;
      })
    );
    setOperators(prevOperators =>
      prevOperators.map(operator => {
        if (operator.id === operatorId) {
          const updatedAssignedTrucks = operator.assignedTrucks.filter(t => t.id !== truckId);
          return { ...operator, assignedTrucks: updatedAssignedTrucks, status: updatedAssignedTrucks.length > 0 ? 'Busy' : 'Available' };
        }
        return operator;
      })
    );
  }, [updateTruckStatusLogic]);

  const markTruckComplete = useCallback((truckId: string) => {
    setTrucks(prevTrucks =>
      prevTrucks.map(truck => {
        if (truck.id === truckId) {
          // Unassign all operators when truck is completed
          const updatedTruck = { ...truck, status: 'Completed', assignedOperatorIds: [] };
          return updatedTruck;
        }
        return truck;
      })
    );
    setOperators(prevOperators =>
      prevOperators.map(operator => {
        const updatedAssignedTrucks = operator.assignedTrucks.filter(t => t.id !== truckId);
        return { ...operator, assignedTrucks: updatedAssignedTrucks, status: updatedAssignedTrucks.length > 0 ? 'Busy' : 'Available' };
      })
    );
  }, []);

  const updateTruckStatus = useCallback((truckId: string, newStatus: TruckStatus) => {
    setTrucks(prevTrucks =>
      prevTrucks.map(truck =>
        truck.id === truckId ? { ...truck, status: newStatus } : truck
      )
    );
  }, []);

  const updateOperatorStatus = useCallback((operatorId: string, newStatus: Operator['status']) => {
    setOperators(prevOperators =>
      prevOperators.map(operator =>
        operator.id === operatorId ? { ...operator, status: newStatus } : operator
      )
    );
  }, []);

  const updateOperatorCompetencies = useCallback((operatorId: string, newCompetencies: RepairType[]) => {
    setOperators(prevOperators =>
      prevOperators.map(operator =>
        operator.id === operatorId ? { ...operator, competencies: newCompetencies } : operator
      )
    );
  }, []);

  const addOperator = useCallback((newOperator: Omit<Operator, 'id' | 'assignedTrucks'>) => {
    setOperators(prevOperators => [
      ...prevOperators,
      {
        ...newOperator,
        id: `OP-${prevOperators.length + 1}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        assignedTrucks: [],
      },
    ]);
  }, []);

  const removeOperator = useCallback((operatorId: string) => {
    setOperators(prevOperators => prevOperators.filter(op => op.id !== operatorId));
    // Also unassign this operator from any trucks
    setTrucks(prevTrucks =>
      prevTrucks.map(truck => {
        if (truck.assignedOperatorIds.includes(operatorId)) {
          const updatedTruck = { ...truck, assignedOperatorIds: truck.assignedOperatorIds.filter(id => id !== operatorId) };
          return { ...updatedTruck, status: updateTruckStatusLogic(updatedTruck) };
        }
        return truck;
      })
    );
  }, [updateTruckStatusLogic]);


  const contextValue = useMemo(() => ({
    trucks,
    operators,
    prioritizedTrucks,
    allProjectCodes,
    allCustomerNames,
    allMarkets,
    markDeviationComplete,
    markMissingPartComplete,
    assignOperatorToTruck,
    unassignOperatorFromTruck,
    markTruckComplete,
    markCustomerAdaptationComplete,
    updateTruckStatus,
    updateOperatorStatus,
    updateOperatorCompetencies,
    addOperator,
    removeOperator,
  }), [
    trucks,
    operators,
    prioritizedTrucks,
    allProjectCodes,
    allCustomerNames,
    allMarkets,
    markDeviationComplete,
    markMissingPartComplete,
    assignOperatorToTruck,
    unassignOperatorFromTruck,
    markTruckComplete,
    markCustomerAdaptationComplete,
    updateTruckStatus,
    updateOperatorStatus,
    updateOperatorCompetencies,
    addOperator,
    removeOperator,
  ]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
