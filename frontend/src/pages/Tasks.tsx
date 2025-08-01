import React from 'react';
import Layout from '../components/Layout';
import TasksPage from './TasksPage';

const Tasks: React.FC = () => {
  return (
    <Layout>
      <TasksPage />
    </Layout>
  );
};

export default Tasks;