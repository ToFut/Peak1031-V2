#\!/bin/bash

# Fix imports across all TypeScript files
find . -name "*.tsx" -o -name "*.ts" | while read file; do
  echo "Processing: $file"
  
  # Calculate relative path depth for this file  
  depth=$(echo "$file" | tr -cd '/' | wc -c)
  
  # Build relative path prefix based on depth
  if [[ $depth -eq 1 ]]; then
    prefix="./"
  elif [[ $depth -eq 2 ]]; then
    prefix="../"
  elif [[ $depth -eq 3 ]]; then
    prefix="../../"
  elif [[ $depth -eq 4 ]]; then
    prefix="../../../"
  else
    prefix="../../../../"
  fi
  
  # Fix specific import patterns
  sed -i '' "s|from 'shared/hooks/useAuth'|from '${prefix}shared/hooks/useAuth'|g" "$file" 2>/dev/null
  sed -i '' "s|from 'shared/services/api'|from '${prefix}shared/services/api'|g" "$file" 2>/dev/null
  sed -i '' "s|from 'shared/ui/|from '${prefix}shared/ui/|g" "$file" 2>/dev/null
  sed -i '' "s|from 'entities/|from '${prefix}entities/|g" "$file" 2>/dev/null
done

echo "✅ All imports fixed"
