  Original PP Matter Fields (from API)

  The PracticePanther API returns matters with these fields:

  Core Fields:
  - id - Unique PP matter ID (e.g., "pp-matter-12345")
  - name - Matter name/title (e.g., "Smith Family 1031 Exchange")
  - description - Matter description
  - notes - General matter notes
  - status - Matter status (active, closed, completed, etc.)
  - external_id - External reference ID
  - client_id - Reference to client contact

  Dates:
  - created_at - Creation timestamp
  - updated_at - Last update timestamp
  - start_date - Matter start date
  - close_date - Matter close date
  - due_date - Matter due date

  Classification:
  - practice_area - Object with id and name (e.g., "1031 Exchanges")
  - matter_type - Type of matter (e.g., "Real Estate Exchange")
  - billing_method - How matter is billed (flat_fee, hourly, etc.)
  - priority - Matter priority (high, medium, low)

  Financial:
  - estimated_hours - Estimated work hours
  - hourly_rate - Billing rate per hour
  - fixed_fee - Fixed fee amount
  - budget - Matter budget

  Assignment:
  - assigned_attorney - Primary attorney ID
  - assigned_paralegal - Assigned paralegal ID
  - responsible_attorney - Responsible attorney ID
  - assigned_to_users - Array of assigned users

  Custom Fields:
  - custom_fields - Object with custom field values
  - custom_field_values - Array of custom fields (alternative format)

  Additional Metadata:
  - tags - Array of tags
  - is_active - Boolean
  - is_billable - Boolean
  - is_confidential - Boolean
  - phase - Current matter phase
  - stage - Current stage
  - substatus - Detailed status