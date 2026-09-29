/**
 * Default response-message keys, mirroring Modules/Core/lang/en/app.php.
 * A module can register its own overrides via MessageService.register().
 */
export const DEFAULT_MESSAGES: Record<string, string> = {
  'fetch-all-success': 'List fetched successfully.',
  'fetch-success': ':name fetched successfully.',
  'create-success': ':name created successfully.',
  'update-success': ':name updated successfully.',
  'delete-success': ':name deleted successfully.',
  'delete-error': 'Unable to delete :name.',
  'last-delete-error': 'Cannot delete the last :name.',
  'not-found': ':name not found.',
  'not-matched': ':name does not match.',
  'status-updated': ':name status updated successfully.',
  'restore-success': ':name restored successfully.',
};
