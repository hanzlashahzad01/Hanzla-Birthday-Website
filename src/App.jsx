import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import CreateWish from './components/CreateWish';
import ViewWish from './components/ViewWish';

function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/create" replace />} />
          <Route path="/create" element={<CreateWish />} />
          <Route path="/wish" element={<ViewWish />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;
