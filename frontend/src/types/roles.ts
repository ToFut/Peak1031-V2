export type UserRole = 'admin' | 'client' | 'coordinator' | 'third_party' | 'agency';

export interface RoleConfig {
  permissions: {
    exchanges: {
      view: 'all' | 'assigned' | 'managed' | 'participating';
      create: boolean;
      edit: boolean;
      delete: boolean;
      assign_users: boolean;
      manage_status: boolean;
    };
    tasks: {
      view: 'all' | 'assigned' | 'managed' | 'none';
      create: boolean;
      edit: boolean;
      delete: boolean;
      assign: boolean;
    };
    documents: {
      view: 'all' | 'assigned' | 'none';
      upload: boolean;
      download: boolean;
      delete: boolean;
      manage_permissions: boolean;
    };
    messages: {
      view: 'all' | 'assigned' | 'none';
      send: boolean;
      participate: boolean;
    };
    contacts: {
      view: 'all' | 'assigned' | 'company' | 'none';
      create: boolean;
      edit: boolean;
      delete: boolean;
    };
    users: {
      view: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
      manage_roles: boolean;
    };
    system: {
      view_audit: boolean;
      manage_settings: boolean;
      sync_pp: boolean;
      view_analytics: boolean;
    };
  };
  ui: {
    sidebar_items: string[];
    dashboard_widgets: string[];
    page_titles: Record<string, string>;
    action_buttons: Record<string, string[]>;
  };
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  admin: {
    permissions: {
      exchanges: {
        view: 'all',
        create: true,
        edit: true,
        delete: true,
        assign_users: true,
        manage_status: true
      },
      tasks: {
        view: 'all',
        create: true,
        edit: true,
        delete: true,
        assign: true
      },
      documents: {
        view: 'all',
        upload: true,
        download: true,
        delete: true,
        manage_permissions: true
      },
      messages: {
        view: 'all',
        send: true,
        participate: true
      },
      contacts: {
        view: 'all',
        create: true,
        edit: true,
        delete: true
      },
      users: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        manage_roles: true
      },
      system: {
        view_audit: true,
        manage_settings: true,
        sync_pp: true,
        view_analytics: true
      }
    },
    ui: {
      sidebar_items: ['overview', 'exchanges', 'tasks', 'users', 'documents', 'messages', 'system', 'templates', 'audit', 'sync'],
      dashboard_widgets: ['system_stats', 'exchange_analytics', 'user_management', 'quick_actions', 'audit_logs'],
      page_titles: {
        exchanges: 'Exchange Management',
        tasks: 'Task Management',
        documents: 'Document Center',
        messages: 'Messages',
        contacts: 'Contact Management'
      },
      action_buttons: {
        exchanges: ['create', 'bulk_edit', 'export', 'sync'],
        tasks: ['create', 'assign', 'bulk_update', 'export'],
        documents: ['upload', 'create_template', 'bulk_operations', 'manage_permissions'],
        messages: ['broadcast', 'create_channel', 'moderate'],
        contacts: ['create', 'import', 'export', 'sync_pp']
      }
    }
  },
  client: {
    permissions: {
      exchanges: {
        view: 'assigned',
        create: false,
        edit: false,
        delete: false,
        assign_users: false,
        manage_status: false
      },
      tasks: {
        view: 'assigned',
        create: false,
        edit: true,
        delete: false,
        assign: false
      },
      documents: {
        view: 'assigned',
        upload: true,
        download: true,
        delete: false,
        manage_permissions: false
      },
      messages: {
        view: 'assigned',
        send: true,
        participate: true
      },
      contacts: {
        view: 'assigned',
        create: false,
        edit: false,
        delete: false
      },
      users: {
        view: false,
        create: false,
        edit: false,
        delete: false,
        manage_roles: false
      },
      system: {
        view_audit: false,
        manage_settings: false,
        sync_pp: false,
        view_analytics: false
      }
    },
    ui: {
      sidebar_items: ['overview', 'my_exchanges', 'my_tasks', 'documents', 'messages', 'settings'],
      dashboard_widgets: ['my_stats', 'urgent_tasks', 'recent_exchanges', 'next_steps', 'progress_tracker'],
      page_titles: {
        exchanges: 'My Exchanges',
        tasks: 'My Tasks',
        documents: 'My Documents',
        messages: 'Messages',
        contacts: 'Exchange Team'
      },
      action_buttons: {
        exchanges: ['view_details', 'contact_coordinator'],
        tasks: ['mark_complete', 'request_help', 'upload_document'],
        documents: ['upload', 'download', 'request_signature'],
        messages: ['reply', 'start_chat'],
        contacts: ['contact', 'view_profile']
      }
    }
  },
  coordinator: {
    permissions: {
      exchanges: {
        view: 'managed',
        create: true,
        edit: true,
        delete: false,
        assign_users: true,
        manage_status: true
      },
      tasks: {
        view: 'managed',
        create: true,
        edit: true,
        delete: true,
        assign: true
      },
      documents: {
        view: 'assigned',
        upload: true,
        download: true,
        delete: true,
        manage_permissions: true
      },
      messages: {
        view: 'assigned',
        send: true,
        participate: true
      },
      contacts: {
        view: 'assigned',
        create: false,
        edit: true,
        delete: false
      },
      users: {
        view: false,
        create: false,
        edit: false,
        delete: false,
        manage_roles: false
      },
      system: {
        view_audit: false,
        manage_settings: false,
        sync_pp: false,
        view_analytics: true
      }
    },
    ui: {
      sidebar_items: ['overview', 'exchanges', 'tasks', 'messages', 'contacts', 'documents', 'settings'],
      dashboard_widgets: ['coordination_stats', 'priority_actions', 'exchange_pipeline', 'team_performance'],
      page_titles: {
        exchanges: 'Exchange Coordination',
        tasks: 'Task Management',
        documents: 'Document Center',
        messages: 'Team Communications',
        contacts: 'Participants'
      },
      action_buttons: {
        exchanges: ['create', 'assign_users', 'update_status', 'generate_report'],
        tasks: ['create', 'assign', 'set_priority', 'track_progress'],
        documents: ['upload', 'organize', 'set_permissions', 'generate_from_template'],
        messages: ['broadcast', 'create_group', 'schedule_meeting'],
        contacts: ['add_participant', 'update_role', 'send_invite']
      }
    }
  },
  third_party: {
    permissions: {
      exchanges: {
        view: 'participating',
        create: false,
        edit: false,
        delete: false,
        assign_users: false,
        manage_status: false
      },
      tasks: {
        view: 'none',
        create: false,
        edit: false,
        delete: false,
        assign: false
      },
      documents: {
        view: 'assigned',
        upload: false,
        download: true,
        delete: false,
        manage_permissions: false
      },
      messages: {
        view: 'assigned',
        send: true,
        participate: true
      },
      contacts: {
        view: 'assigned',
        create: false,
        edit: false,
        delete: false
      },
      users: {
        view: false,
        create: false,
        edit: false,
        delete: false,
        manage_roles: false
      },
      system: {
        view_audit: false,
        manage_settings: false,
        sync_pp: false,
        view_analytics: false
      }
    },
    ui: {
      sidebar_items: ['overview', 'exchanges', 'documents', 'messages', 'settings'],
      dashboard_widgets: ['participation_stats', 'exchange_status', 'performance_summary', 'responsibilities'],
      page_titles: {
        exchanges: 'Exchange Participation',
        tasks: 'My Responsibilities',
        documents: 'Exchange Documents',
        messages: 'Communications',
        contacts: 'Exchange Team'
      },
      action_buttons: {
        exchanges: ['view_details', 'contact_coordinator'],
        tasks: ['view_details'],
        documents: ['download', 'view'],
        messages: ['reply', 'participate'],
        contacts: ['view_profile', 'contact']
      }
    }
  },
  agency: {
    permissions: {
      exchanges: {
        view: 'participating',
        create: false,
        edit: false,
        delete: false,
        assign_users: false,
        manage_status: false
      },
      tasks: {
        view: 'assigned',
        create: false,
        edit: true,
        delete: false,
        assign: false
      },
      documents: {
        view: 'assigned',
        upload: true,
        download: true,
        delete: false,
        manage_permissions: false
      },
      messages: {
        view: 'assigned',
        send: true,
        participate: true
      },
      contacts: {
        view: 'company',
        create: true,
        edit: true,
        delete: false
      },
      users: {
        view: false,
        create: false,
        edit: false,
        delete: false,
        manage_roles: false
      },
      system: {
        view_audit: false,
        manage_settings: false,
        sync_pp: false,
        view_analytics: true
      }
    },
    ui: {
      sidebar_items: ['overview', 'service_portfolio', 'our_team', 'documents', 'messages', 'performance', 'settings'],
      dashboard_widgets: ['service_stats', 'portfolio_overview', 'team_performance', 'client_satisfaction'],
      page_titles: {
        exchanges: 'Service Portfolio',
        tasks: 'Service Tasks',
        documents: 'Service Documents',
        messages: 'Client Communications',
        contacts: 'Our Team'
      },
      action_buttons: {
        exchanges: ['view_services', 'contact_client', 'update_status'],
        tasks: ['update_progress', 'request_resources'],
        documents: ['upload', 'share_with_client'],
        messages: ['client_update', 'internal_discussion'],
        contacts: ['add_team_member', 'assign_to_exchange', 'view_performance']
      }
    }
  }
};