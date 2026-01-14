const MODULES = [
  {
    id: 'itam',
    name: 'ITAM',
    description: 'Asset tracking and assignment',
    route: '/itam',
    status: 'enabled',
    roles: ['ADMIN', 'IT_STAFF'],
  },
  {
    id: 'inventory',
    name: 'Inventory',
    description: 'Procurement and stock (coming soon)',
    route: '/inventory',
    status: 'disabled',
    roles: ['ADMIN', 'IT_STAFF'],
  },
  {
    id: 'cmdb',
    name: 'CMDB',
    description: 'Configuration database (coming soon)',
    route: '/cmdb',
    status: 'disabled',
    roles: ['ADMIN'],
  },
];

const getModulesForRole = (role) => MODULES.filter((module) => module.roles.includes(role));

module.exports = { getModulesForRole };
