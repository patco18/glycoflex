import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StorageManager } from '@/utils/storageManager';
import type { GlucoseMeasurement } from '@/utils/storage';

export function useMeasurements() {
  return useQuery<GlucoseMeasurement[]>({
    queryKey: ['measurements'],
    queryFn: () => StorageManager.getMeasurements(),
  });
}

export function useDeleteMeasurement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => StorageManager.deleteMeasurement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurements'] });
    },
  });
}
