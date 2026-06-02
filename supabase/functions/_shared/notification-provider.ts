type ServiceClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export async function dispatchNotification(service: ServiceClient, notificationId: string) {
  const { data, error } = await service.rpc("dispatch_notification_for_worker", {
    p_notification_id: notificationId
  });
  if (error) throw new Error(error.message);
  return data;
}
