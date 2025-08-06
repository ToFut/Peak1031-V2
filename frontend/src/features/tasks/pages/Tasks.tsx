import React from 'react';
import Layout from '@/shared/ui/organisms/Layout';
import TasksPage from './TasksPage';

const Tasks: React.FC = () => {
  return (
    <Layout>
      <TasksPage />
    </Layout>
  );
};

export default Tasks;