#!/usr/bin/env node

/**
 * Migration script to update participant permissions from legacy format to new format
 * Converts old permission arrays to new permission objects with proper naming
 */

const supabaseService = require('../services/supabase');

// Mapping of old permissions to new permissions
const permissionMapping = {
  'read': ['can_view_overview', 'can_view_messages', 'can_view_tasks', 'can_view_documents', 'can_view_participants'],
  'write': ['can_edit', 'can_create_tasks', 'can_edit_tasks'],
  'delete': ['can_delete', 'can_delete_documents', 'can_delete_tasks'],
  'comment': ['can_send_messages'],
  'upload_documents': ['can_upload_documents'],
  'upload': ['can_upload_documents'],
  'edit': ['can_edit'],
  'view': ['can_view_overview'],
  'manage': ['can_manage_participants', 'can_add_participants'],
  'admin': ['can_edit', 'can_delete', 'can_add_participants', 'can_manage_participants']
};

// Default permissions based on role
const roleDefaults = {
  admin: {
    can_edit: true,
    can_delete: true,
    can_add_participants: true,
    can_upload_documents: true,
    can_send_messages: true,
    can_view_overview: true,
    can_view_messages: true,
    can_view_tasks: true,
    can_create_tasks: true,
    can_edit_tasks: true,
    can_assign_tasks: true,
    can_view_documents: true,
    can_edit_documents: true,
    can_delete_documents: true,
    can_view_participants: true,
    can_manage_participants: true,
    can_view_financial: true,
    can_edit_financial: true,
    can_view_timeline: true,
    can_edit_timeline: true,
    can_view_reports: true
  },
  coordinator: {
    can_edit: true,
    can_delete: false,
    can_add_participants: true,
    can_upload_documents: true,
    can_send_messages: true,
    can_view_overview: true,
    can_view_messages: true,
    can_view_tasks: true,
    can_create_tasks: true,
    can_edit_tasks: true,
    can_assign_tasks: true,
    can_view_documents: true,
    can_edit_documents: true,
    can_delete_documents: false,
    can_view_participants: true,
    can_manage_participants: true,
    can_view_financial: true,
    can_edit_financial: true,
    can_view_timeline: true,
    can_edit_timeline: true,
    can_view_reports: true
  },
  client: {
    can_edit: true,
    can_delete: false,
    can_add_participants: true,
    can_upload_documents: true,
    can_send_messages: true,
    can_view_overview: true,
    can_view_messages: true,
    can_view_tasks: true,
    can_create_tasks: true,
    can_edit_tasks: true,
    can_assign_tasks: true,
    can_view_documents: true,
    can_edit_documents: true,
    can_delete_documents: false,
    can_view_participants: true,
    can_manage_participants: true,
    can_view_financial: true,
    can_edit_financial: true,
    can_view_timeline: true,
    can_edit_timeline: true,
    can_view_reports: true
  },
  third_party: {
    can_edit: false,
    can_delete: false,
    can_add_participants: false,
    can_upload_documents: false,
    can_send_messages: false,
    can_view_overview: true,
    can_view_messages: false,
    can_view_tasks: false,
    can_create_tasks: false,
    can_edit_tasks: false,
    can_assign_tasks: false,
    can_view_documents: false,
    can_edit_documents: false,
    can_delete_documents: false,
    can_view_participants: false,
    can_manage_participants: false,
    can_view_financial: false,
    can_edit_financial: false,
    can_view_timeline: false,
    can_edit_timeline: false,
    can_view_reports: false
  },
  agency: {
    can_edit: false,
    can_delete: false,
    can_add_participants: false,
    can_upload_documents: false,
    can_send_messages: false,
    can_view_overview: true,
    can_view_messages: false,
    can_view_tasks: false,
    can_create_tasks: false,
    can_edit_tasks: false,
    can_assign_tasks: false,
    can_view_documents: false,
    can_edit_documents: false,
    can_delete_documents: false,
    can_view_participants: false,
    can_manage_participants: false,
    can_view_financial: false,
    can_edit_financial: false,
    can_view_timeline: false,
    can_edit_timeline: false,
    can_view_reports: false
  }
};

async function migratePermissions() {
  console.log('🔄 Starting permission migration...\n');
  
  try {
    // Fetch all participants
    const { data: participants, error } = await supabaseService.client
      .from('exchange_participants')
      .select('id, role, permissions, exchange_id, user_id, contact_id');
    
    if (error) {
      console.error('❌ Error fetching participants:', error);
      return;
    }
    
    console.log(`📊 Found ${participants.length} participants to check\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const participant of participants) {
      try {
        let needsUpdate = false;
        let newPermissions = {};
        
        // Check if permissions need migration
        if (!participant.permissions) {
          // No permissions set, use role defaults
          newPermissions = roleDefaults[participant.role] || roleDefaults.third_party;
          needsUpdate = true;
          console.log(`🔧 Participant ${participant.id}: No permissions, applying ${participant.role} defaults`);
        } else if (Array.isArray(participant.permissions)) {
          // Legacy array format
          if (participant.permissions.some(p => p.startsWith('can_'))) {
            // Already has new-style permissions in array format, convert to object
            newPermissions = roleDefaults[participant.role] || roleDefaults.third_party;
            participant.permissions.forEach(perm => {
              if (perm.startsWith('can_') && newPermissions.hasOwnProperty(perm)) {
                newPermissions[perm] = true;
              }
            });
            needsUpdate = true;
            console.log(`🔄 Participant ${participant.id}: Converting new-style array to object`);
          } else {
            // Old-style permissions, need mapping
            newPermissions = roleDefaults[participant.role] || roleDefaults.third_party;
            
            // Apply mappings for old permissions
            participant.permissions.forEach(oldPerm => {
              if (permissionMapping[oldPerm]) {
                permissionMapping[oldPerm].forEach(newPerm => {
                  if (newPermissions.hasOwnProperty(newPerm)) {
                    newPermissions[newPerm] = true;
                  }
                });
              }
            });
            
            needsUpdate = true;
            console.log(`🔄 Participant ${participant.id}: Migrating old-style permissions [${participant.permissions.join(', ')}]`);
          }
        } else if (typeof participant.permissions === 'object' && !Array.isArray(participant.permissions)) {
          // Already in correct format
          skippedCount++;
          console.log(`✅ Participant ${participant.id}: Already has object permissions`);
          continue;
        }
        
        if (needsUpdate) {
          // Convert object permissions to array of permission names (only true values)
          const permissionArray = Object.entries(newPermissions)
            .filter(([key, value]) => value === true)
            .map(([key]) => key);
          
          // Update the participant
          const { error: updateError } = await supabaseService.client
            .from('exchange_participants')
            .update({
              permissions: permissionArray,
              updated_at: new Date().toISOString()
            })
            .eq('id', participant.id);
          
          if (updateError) {
            console.error(`❌ Error updating participant ${participant.id}:`, updateError);
            errorCount++;
          } else {
            updatedCount++;
            console.log(`✅ Updated participant ${participant.id} with new permissions`);
          }
        }
      } catch (err) {
        console.error(`❌ Error processing participant ${participant.id}:`, err);
        errorCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Updated: ${updatedCount} participants`);
    console.log(`⏭️  Skipped: ${skippedCount} participants (already migrated)`);
    console.log(`❌ Errors: ${errorCount} participants`);
    console.log('\n✨ Migration complete!');
    
  } catch (error) {
    console.error('❌ Fatal error during migration:', error);
  }
  
  process.exit(0);
}

// Run the migration
migratePermissions();