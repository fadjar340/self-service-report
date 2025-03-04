import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './styles.css';

const AdminDatabases = () => {
  const [databases, setDatabases] = useState([]);
  const [name, setName] = useState('');
  const [server, setServer] = useState('');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('');
  const [port, setPort] = useState(5000);
  const [editingDatabase, setEditingDatabase] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch Sybase databases
  useEffect(() => {
    const fetchDatabases = async () => {
      try {
        const response = await axios.get('/database', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setDatabases(response.data);
      } catch (error) {
        toast.error('Failed to fetch databases');
      }
    };
    fetchDatabases();
  }, []);

  // Create or update a database
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingDatabase) {
        const response = await axios.put(`/database/${editingDatabase.id}`, { name, server, user, password, database, port }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setDatabases(databases.map(db => db.id === editingDatabase.id ? response.data : db));
      } else {
        const response = await axios.post('/database', { name, server, user, password, database, port }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setDatabases([...databases, response.data]);
      }
      setName('');
      setServer('');
      setUser('');
      setPassword('');
      setDatabase('');
      setPort(5000);
      setEditingDatabase(null);
    } catch (error) {
      toast.error('Failed to save database');
    } finally {
      setLoading(false);
    }
  };

  // Edit a database
  const handleEdit = (db) => {
    setName(db.name);
    setServer(db.server);
    setUser(db.user);
    setPassword(db.password);
    setDatabase(db.database);
    setPort(db.port);
    setEditingDatabase(db);
  };

  // Delete a database
  const handleDelete = async (id) => {
    try {
      await axios.delete(`/database/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDatabases(databases.filter(db => db.id !== id));
    } catch (error) {
      toast.error('Failed to delete database');
    }
  };

  return (
    <div className="container">
      <h2>Manage Sybase Databases</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="server">Server:</label>
          <input
            type="text"
            id="server"
            value={server}
            onChange={(e) => setServer(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="user">User:</label>
          <input
            type="text"
            id="user"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="database">Database:</label>
          <input
            type="text"
            id="database"
            value={database}
            onChange={(e) => setDatabase(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="port">Port:</label>
          <input
            type="number"
            id="port"
            value={port}
            onChange={(e) => setPort(parseInt(e.target.value))}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : editingDatabase ? 'Update Database' : 'Create Database'}
        </button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Server</th>
            <th>User</th>
            <th>Database</th>
            <th>Port</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {databases.map((db) => (
            <tr key={db.id}>
              <td>{db.name}</td>
              <td>{db.server}</td>
              <td>{db.user}</td>
              <td>{db.database}</td>
              <td>{db.port}</td>
              <td>
                <button onClick={() => handleEdit(db)}>Edit</button>
                <button onClick={() => handleDelete(db.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminDatabases;