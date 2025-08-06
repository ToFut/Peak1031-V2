export const usePermissions = () => {
  return {
    canView: () => true,
    canEdit: () => true,
    canDelete: () => true,
    hasPermission: () => true,
  };
};