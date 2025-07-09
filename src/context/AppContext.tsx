import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Truck, Operator, Deviation, MissingPart } from '@/types';
import { generateTrucks, generateOperators, getPriorityScore, calculateRemainingRepairTime, getAvailableShiftHours } from '@/lib/data';

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);

  useEffect(() => {
    try {
      // Generate initial data
      const initialTrucks = generateTrucks(200);
      const initialOperators = generateOperators(10);
      console.log('Generated initial trucks:', initialTrucks.length, initialTrucks);
      console.log('Generated initial operators:', initialOperators.length, initialOperators);
      setTrucks(initialTrucks);
      setOperators(initialOperators);
    } catch (error) {
      console.error("Error generating initial data in AppProvider:", error);
      // Depending on the error, you might want to set an error state here
      // or display a fallback UI. For now, just log it.
    }
  }, []);

  const prioritizedTrucks = useMemo(() => {
    // Filter out trucks that are 'Overdue - Not Ready' or 'Not Ready' as they have 0 priority score
    const eligibleTrucks = trucks.filter(truck =>
      truck.status !== 'Overdue - Not Ready' &&
      truck.status !== 'Not Ready' &&
      calculateRemainingRepairTime(truck) > 0 // Only prioritize trucks with actual work remaining
    );

    return [...eligibleTrucks].sort((a, b) => {
      const scoreA = getPriorityScore(a).totalScore;
      const scoreB = getPriorityScore(b).totalScore;
      return scoreB - scoreA; // Sort in descending order of priority
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
        // Recalculate repairTimeEstimate based on remaining work
        updatedTruck.repairTimeEstimate = calculateRemainingRepairTime(updatedTruck);
        return updatedTruck;
      }
      return truck;
    }));
    return success;
  }, []);

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
        // Recalculate repairTimeEstimate based on remaining work
        updatedTruck.repairTimeEstimate = calculateRemainingRepairTime(updatedTruck);
        return updatedTruck;
      }
      return truck;
    }));
  }, []);

  const markCustomerAdaptationComplete = useCallback((truckId: string, completedBy: string) => {
    setTrucks(prevTrucks => prevTrucks.map(truck => {
      if (truck.id === truckId && truck.customerAdaptationWork && !truck.customerAdaptationCompleted) {
        const updatedTruck = { ...truck, customerAdaptationCompleted: true, customerAdaptationCompletedAt: new Date(), customerAdaptationCompletedBy: completedBy };
        // Recalculate repairTimeEstimate based on remaining work
        updatedTruck.repairTimeEstimate = calculateRemainingRepairTime(updatedTruck);
        return updatedTruck;
      }
      return truck;
    }));
  }, []);

  const unassignOperatorFromTruck = useCallback((truckId: string, operatorId: string) => {
    setTrucks(prevTrucks => prevTrucks.map(truck =>
      truck.id === truckId
        ? { ...truck, assignedOperatorIds: truck.assignedOperatorIds.filter(id => id !== operatorId) }
        : truck
    ));

    setOperators(prevOperators => prevOperators.map(operator => {
      if (operator.id === operatorId) {
        const updatedAssignedTruckIds = operator.assignedTruckIds.filter(id => id !== truckId);
        return {
          ...operator,
          assignedTruckIds: updatedAssignedTruckIds,
          status: updatedAssignedTruckIds.length === 0 ? 'Available' : 'Busy',
        };
      }
      return operator;
    }));
  }, []);

  const assignOperatorToTruck = useCallback((truckId: string, operatorId: string) => {
    setTrucks(prevTrucks =>
      prevTrucks.map(truck =>
        truck.id === truckId && !truck.assignedOperatorIds.includes(operatorId)
          ? { ...truck, assignedOperatorIds: [...truck.assignedOperatorIds, operatorId], status: 'Assigned' }
          : truck
      )
    );

    setOperators(prevOperators =>
      prevOperators.map(operator => {
        if (operator.id === operatorId) {
          if (!operator.assignedTruckIds.includes(truckId)) {
            return {
              ...operator,
              assignedTruckIds: [...operator.assignedTruckIds, truckId],
              status: 'Busy',
            };
          }
        }
        return operator;
      })
    );
  }, []);

  const markTruckComplete = useCallback((truckId: string) => {
    setTrucks(prevTrucks => prevTrucks.map(truck => {
      if (truck.id === truckId) {
        // Unassign all operators from this truck
        truck.assignedOperatorIds.forEach(operatorId => {
          setOperators(prevOperators => prevOperators.map(operator => {
            if (operator.id === operatorId) {
              const updatedAssignedTruckIds = operator.assignedTruckIds.filter(tId => tId !== truckId);
              return {
                ...operator,
                assignedTruckIds: updatedAssignedTruckIds,
                status: updatedAssignedTruckIds.length === 0 ? 'Available' : 'Busy',
              };
            }
            return operator;
          }));
        });
        return { ...truck, status: 'Completed', assignedOperatorIds: [], repairTimeEstimate: 0 }; // Set remaining time to 0
      }
      return truck;
    }));
  }, []);

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
