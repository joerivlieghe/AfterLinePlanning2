import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  Truck,
  Operator,
} from '@/types';
import {
  generateTrucks,
  generateOperators,
  calculateRemainingRepairTime,
  getPriorityScore,
  getAvailableShiftHours,
} from '@/lib/data';

interface AppContextType {
  trucks: Truck[];
  operators: Operator[];
  allProjectCodes: string[];
  markDeviationComplete: (
    truckId: string,
    deviationId: string,
    completedBy: string
  ) => void;
  markMissingPartComplete: (
    truckId: string,
    partId: string,
    completedBy: string
  ) => void;
  markCustomerAdaptationComplete: (
    truckId: string,
    completedBy: string
  ) => void;
  assignOperatorToTruck: (truckId: string, operatorId: string) => void;
  unassignOperatorFromTruck: (truckId: string, operatorId: string) => void;
  markTruckComplete: (truckId: string) => void;
  autoAssignOperators: (planningDate: Date) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);

  useEffect(() => {
    // Generate initial data
    const initialTrucks = generateTrucks(200);
    const initialOperators = generateOperators(10);
    setTrucks(initialTrucks);
    setOperators(initialOperators);
  }, []);

  // Derive all unique project codes from the trucks data
  const allProjectCodes = useMemo(() => {
    const codes = new Set<string>();
    trucks.forEach(truck => {
      if (truck.projectCode) {
        codes.add(truck.projectCode);
      }
    });
    return Array.from(codes).sort();
  }, [trucks]);

  const markDeviationComplete = useCallback(
    (truckId: string, deviationId: string, completedBy: string) => {
      setTrucks((prevTrucks) =>
        prevTrucks.map((truck) => {
          if (truck.id === truckId) {
            const updatedDeviations = truck.deviations.map((dev) =>
              dev.id === deviationId
                ? { ...dev, completed: true, completedBy, completedAt: new Date() }
                : dev
            );
            const updatedTruck = { ...truck, deviations: updatedDeviations };
            updatedTruck.repairTimeEstimate = calculateRemainingRepairTime(updatedTruck);
            return updatedTruck;
          }
          return truck;
        })
      );
    },
    []
  );

  const markMissingPartComplete = useCallback(
    (truckId: string, partId: string, completedBy: string) => {
      setTrucks((prevTrucks) =>
        prevTrucks.map((truck) => {
          if (truck.id === truckId) {
            const updatedMissingParts = truck.missingParts.map((part) =>
              part.id === partId
                ? { ...part, completed: true, completedBy, completedAt: new Date() }
                : part
            );
            const updatedTruck = { ...truck, missingParts: updatedMissingParts };
            updatedTruck.repairTimeEstimate = calculateRemainingRepairTime(updatedTruck);
            return updatedTruck;
          }
          return truck;
        })
      );
    },
    []
  );

  const markCustomerAdaptationComplete = useCallback(
    (truckId: string, completedBy: string) => {
      setTrucks((prevTrucks) =>
        prevTrucks.map((truck) => {
          if (truck.id === truckId) {
            const updatedTruck = {
              ...truck,
              customerAdaptationCompleted: true,
              customerAdaptationCompletedBy: completedBy,
              customerAdaptationCompletedAt: new Date(),
            };
            updatedTruck.repairTimeEstimate = calculateRemainingRepairTime(updatedTruck);
            return updatedTruck;
          }
          return truck;
        })
      );
    },
    []
  );

  const assignOperatorToTruck = useCallback(
    (truckId: string, operatorId: string) => {
      setTrucks((prevTrucks) =>
        prevTrucks.map((truck) =>
          truck.id === truckId
            ? {
                ...truck,
                assignedOperatorIds: [...new Set([...truck.assignedOperatorIds, operatorId])],
                status: 'Assigned',
              }
            : truck
        )
      );
      setOperators((prevOperators) =>
        prevOperators.map((operator) =>
          operator.id === operatorId
            ? {
                ...operator,
                assignedTruckIds: [...new Set([...operator.assignedTruckIds, truckId])],
                status: 'Busy',
              }
            : operator
        )
      );
    },
    []
  );

  const unassignOperatorFromTruck = useCallback(
    (truckId: string, operatorId: string) => {
      setTrucks((prevTrucks) =>
        prevTrucks.map((truck) => {
          if (truck.id === truckId) {
            const updatedAssignedOperatorIds = truck.assignedOperatorIds.filter(
              (id) => id !== operatorId
            );
            // Revert status if no operators are assigned and truck is not completed
            const newStatus =
              updatedAssignedOperatorIds.length === 0 && truck.status !== 'Completed'
                ? calculateRemainingRepairTime(truck) > 0
                  ? truck.missingParts.some(mp => mp.status !== 'Available' && !mp.completed)
                    ? 'Not Ready'
                    : 'Ready to Plan'
                  : 'Completed' // If no remaining work, mark as completed
                : truck.status;
            return {
              ...truck,
              assignedOperatorIds: updatedAssignedOperatorIds,
              status: newStatus,
            };
          }
          return truck;
        })
      );
      setOperators((prevOperators) =>
        prevOperators.map((operator) =>
          operator.id === operatorId
            ? {
                ...operator,
                assignedTruckIds: operator.assignedTruckIds.filter((id) => id !== truckId),
                status: 'Available', // Operator becomes available after unassignment
              }
            : operator
        )
      );
    },
    []
  );

  const markTruckComplete = useCallback((truckId: string) => {
    setTrucks((prevTrucks) =>
      prevTrucks.map((truck) => {
        if (truck.id === truckId) {
          // Mark all deviations and missing parts as completed
          const completedDeviations = truck.deviations.map(dev => ({ ...dev, completed: true, completedBy: dev.completedBy || 'System', completedAt: dev.completedAt || new Date() }));
          const completedMissingParts = truck.missingParts.map(mp => ({ ...mp, completed: true, completedBy: mp.completedBy || 'System', completedAt: mp.completedAt || new Date() }));

          return {
            ...truck,
            status: 'Completed',
            repairTimeEstimate: 0,
            deviations: completedDeviations,
            missingParts: completedMissingParts,
            customerAdaptationCompleted: true,
            customerAdaptationCompletedBy: truck.customerAdaptationCompletedBy || 'System',
            customerAdaptationCompletedAt: truck.customerAdaptationCompletedAt || new Date(),
            assignedOperatorIds: [], // Unassign all operators
          };
        }
        return truck;
      })
    );

    // Unassign operators from this truck
    setOperators((prevOperators) =>
      prevOperators.map((operator) => ({
        ...operator,
        assignedTruckIds: operator.assignedTruckIds.filter((id) => id !== truckId),
        status: operator.assignedTruckIds.includes(truckId) && operator.assignedTruckIds.length === 1
          ? 'Available' // If this was the only truck, set to available
          : operator.status, // Otherwise, keep current status
      }))
    );
  }, []);

  const autoAssignOperators = useCallback(
    (planningDate: Date) => {
      const availableOperators = operators.filter(
        (op) => op.status === 'Available' || op.status === 'Busy'
      );

      // Sort trucks by priority score (descending)
      const sortedTrucks = [...trucks]
        .filter(
          (t) =>
            t.status !== 'Completed' &&
            t.status !== 'Missing Parts Not Available' &&
            calculateRemainingRepairTime(t) > 0
        )
        .sort((a, b) => {
          const scoreA = getPriorityScore(a).totalScore;
          const scoreB = getPriorityScore(b).totalScore;
          return scoreB - scoreA;
        });

      const updatedTrucks = [...trucks];
      const updatedOperators = [...operators];

      sortedTrucks.forEach((truck) => {
        let truckRemainingTime = calculateRemainingRepairTime(truck);

        // Find operators already assigned to this truck and account for their remaining time
        const currentlyAssignedOperators = updatedOperators.filter(op => truck.assignedOperatorIds.includes(op.id));
        currentlyAssignedOperators.forEach(op => {
          // This logic needs refinement for actual distributed workload
          // For now, the `operatorWorkloadOnThisTruck` variable is unused as it's complex to simulate here.
          // const operatorWorkloadOnThisTruck = truck.assignedOperatorIds.filter(id => id === truck.id).length > 0 ? truckRemainingTime : 0;
        });


        if (truckRemainingTime > 0) {
          // Filter operators who are available and competent for this truck's repair type
          const eligibleOperators = availableOperators.filter(
            (op) =>
              op.competencies.includes(truck.repairType) &&
              getAvailableShiftHours(op, updatedTrucks, planningDate) > 0
          ).sort((a, b) => {
            // Prioritize operators with more available hours
            return getAvailableShiftHours(b, updatedTrucks, planningDate) - getAvailableShiftHours(a, updatedTrucks, planningDate);
          });

          eligibleOperators.forEach((operator) => {
            if (truckRemainingTime > 0 && getAvailableShiftHours(operator, updatedTrucks, planningDate) > 0) {
              const hoursToAssign = Math.min(
                truckRemainingTime,
                getAvailableShiftHours(operator, updatedTrucks, planningDate)
              );

              if (hoursToAssign > 0) {
                // Assign operator to truck
                const truckIndex = updatedTrucks.findIndex((t) => t.id === truck.id);
                if (truckIndex !== -1) {
                  const currentTruck = updatedTrucks[truckIndex];
                  if (!currentTruck.assignedOperatorIds.includes(operator.id)) {
                    currentTruck.assignedOperatorIds = [...currentTruck.assignedOperatorIds, operator.id];
                    currentTruck.status = 'Assigned';
                  }
                  // Deduct assigned hours from truck's remaining time (conceptual, as actual deduction happens on completion)
                  truckRemainingTime -= hoursToAssign;
                  currentTruck.repairTimeEstimate = Math.max(0, currentTruck.repairTimeEstimate - hoursToAssign); // Deduct from truck's estimate

                  // Update operator's assigned trucks and status
                  const operatorIndex = updatedOperators.findIndex((op) => op.id === operator.id);
                  if (operatorIndex !== -1) {
                    const currentOperator = updatedOperators[operatorIndex];
                    if (!currentOperator.assignedTruckIds.includes(truck.id)) {
                      currentOperator.assignedTruckIds = [...currentOperator.assignedTruckIds, truck.id];
                    }
                    currentOperator.status = 'Busy';
                  }
                }
              }
            }
          });
        }
      });

      setTrucks(updatedTrucks);
      setOperators(updatedOperators);
    },
    [operators, trucks]
  );

  const contextValue = useMemo(
    () => ({
      trucks,
      operators,
      allProjectCodes,
      markDeviationComplete,
      markMissingPartComplete,
      markCustomerAdaptationComplete,
      assignOperatorToTruck,
      unassignOperatorFromTruck,
      markTruckComplete,
      autoAssignOperators,
    }),
    [
      trucks,
      operators,
      allProjectCodes,
      markDeviationComplete,
      markMissingPartComplete,
      markCustomerAdaptationComplete,
      assignOperatorToTruck,
      unassignOperatorFromTruck,
      markTruckComplete,
      autoAssignOperators,
    ]
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
