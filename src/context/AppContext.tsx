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
  unassignOperatorFromTruck: (truckId: string) => void;
  assignOperatorToTruck: (truckId: string, operatorId: string) => void;
  markTruckComplete: (truckId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);

  useEffect(() => {
    // Generate initial data
    setTrucks(generateTrucks(200));
    setOperators(generateOperators(12));
  }, []);

  // Memoize and update truck statuses based on current data
  const updatedTrucks = useMemo(() => {
    return trucks.map(truck => {
      let newStatus: TruckStatus = truck.status;

      const hasPendingMissingParts = truck.missingParts.some(
        (mp) => mp.status !== 'Available' && !mp.completed
      );
      const isCurrentlyOverdue = isPast(truck.deliveryDate, new Date());
      const allDeviationsCompleted = truck.deviations.every(dev => dev.completed);
      const allMissingPartsCompleted = truck.missingParts.every(mp => mp.completed);
      const customerAdaptationWorkExists = truck.customerAdaptationWork !== null;
      const customerAdaptationIsCompleted = truck.customerAdaptationCompleted;

      const totalWorkItems = truck.deviations.length + truck.missingParts.length + (customerAdaptationWorkExists ? 1 : 0);
      const completedWorkItems = truck.deviations.filter(d => d.completed).length + truck.missingParts.filter(mp => mp.completed).length + (customerAdaptationWorkExists && customerAdaptationIsCompleted ? 1 : 0);

      // Status determination logic
      // 1. Completed Status (Only set by markTruckComplete, so not here)
      if (truck.status === 'Completed') {
        newStatus = 'Completed';
      }
      // 2. Not Ready Statuses (if not completed)
      else if (hasPendingMissingParts) {
        if (isCurrentlyOverdue) {
          newStatus = 'Overdue - Not Ready';
        } else {
          newStatus = 'Not Ready';
        }
      }
      // 3. Assigned / Partial / Ready to Finish Statuses (if not completed and ready)
      else if (truck.assignedOperatorId) {
        if (completedWorkItems === totalWorkItems) {
          // All individual work items are completed, but truck not manually finished
          newStatus = 'Ready to Finish'; 
        } else if (completedWorkItems > 0) {
          newStatus = 'Partial';
        } else { // Assigned, but no work items completed yet
          newStatus = 'Assigned';
        }
      }
      // 4. Ready to Plan Statuses (if not completed, not assigned, and ready)
      else { // No assigned operator, no pending missing parts, not completed
        if (isCurrentlyOverdue) {
          newStatus = 'Overdue - Ready to Plan';
        } else {
          newStatus = 'Ready to Plan';
        }
      }

      return { ...truck, status: newStatus };
    });
  }, [trucks]);

  // Prioritize trucks that are ready for assignment (Overdue - Ready to Plan, Ready to Plan)
  const prioritizedTrucks = useMemo(() => {
    const readyForAssignment = updatedTrucks.filter(truck => 
      truck.status === 'Ready to Plan' || truck.status === 'Overdue - Ready to Plan'
    );
    
    // Sort by priority score (higher score first)
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
        if (!truck.assignedOperatorId) {
          // Deviation cannot be marked complete without an assigned operator
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

  const unassignOperatorFromTruck = useCallback((truckId: string) => {
    setTrucks(prevTrucks => prevTrucks.map(truck =>
      truck.id === truckId
        ? { ...truck, assignedOperatorId: null, status: 'Pending' } // Reset status to Pending
        : truck
    ));
    setOperators(prevOperators => prevOperators.map(operator => ({
      ...operator,
      assignedTrucks: operator.assignedTrucks.filter(t => t.id !== truckId),
      status: operator.assignedTrucks.filter(t => t.id !== truckId).length === 0 ? 'Available' : operator.status,
    })));
  }, []);

  const assignOperatorToTruck = useCallback((truckId: string, operatorId: string) => {
    setTrucks(prevTrucks =>
      prevTrucks.map(truck =>
        truck.id === truckId
          ? { ...truck, assignedOperatorId: operatorId, status: 'Assigned' }
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
                trucks.find(t => t.id === truckId)!,
              ],
              status: 'Busy',
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

        // Check if all conditions for final completion are met
        if (allDeviationsCompleted && allMissingPartsCompleted && (!customerAdaptationWorkExists || customerAdaptationIsCompleted)) {
          // Unassign operator if any
          if (truck.assignedOperatorId) {
            setOperators(prevOperators => prevOperators.map(operator => ({
              ...operator,
              assignedTrucks: operator.assignedTrucks.filter(t => t.id !== truckId),
              status: operator.assignedTrucks.filter(t => t.id !== truckId).length === 0 ? 'Available' : operator.status,
            })));
          }
          return { ...truck, status: 'Completed', assignedOperatorId: null };
        } else {
          // If not all conditions met, do not mark complete and potentially show an error/toast
          console.warn(`Cannot mark truck ${truckId} complete: Not all work items are finished.`);
          return truck; // Return original truck if conditions not met
        }
      }
      return truck;
    }));
  }, []);

  const contextValue = useMemo(() => ({
    trucks: updatedTrucks, // Use updatedTrucks for consistent status
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
