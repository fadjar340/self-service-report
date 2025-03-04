import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './styles.css';

const UserQueries = () => {
  const [queries, setQueries] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editQuery, setEditQuery] = useState(null); // State for editing a query
  const [newQuery, setNewQuery] = useState({ name: '', sybase_query: '' }); // State for creating a new query
  const [sybaseDatabases, setSybaseDatabases] = useState([]); // State for Sybase databases
  const [selectedDatabase, setSelectedDatabase] = useState(''); // State for selected Sybase database
  const isAdmin = localStorage.getItem('role') === 'admin'; // Check if user is admin

  // Fetch predefined queries
  useEffect(() => {
    const fetchQueries = async () => {
      try {
        const response = await axios.get('/query/predefined', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.data.success) {
          setQueries(response.data.data);
        } else {
          toast.error(response.data.message);
        }
      } catch (error) {
        toast.error('Failed to fetch predefined queries');
      }
    };
    fetchQueries();
  }, []);

  // Fetch Sybase databases
  useEffect(() => {
    const fetchSybaseDatabases = async () => {
      try {
        const response = await axios.get('/sybase/databases', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.data.success) {
          setSybaseDatabases(response.data.data);
        } else {
          toast.error(response.data.message);
        }
      } catch (error) {
        toast.error('Failed to fetch Sybase databases');
      }
    };
    fetchSybaseDatabases();
  }, []);

  // Run query
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !selectedDatabase) {
      toast.error('Start date, end date, and Sybase database are required');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`/query/run/${selectedQuery}`, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          databaseId: selectedDatabase,
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setData(response.data.data);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Failed to execute query');
    } finally {
      setLoading(false);
    }
  };

  // Handle creating a new query (admin-only)
  const handleCreateQuery = async () => {
    if (!newQuery.name || !newQuery.sybase_query) {
      toast.error('Name and Sybase query are required');
      return;
    }

    try {
      const response = await axios.post(
        '/query/create',
        {
          name: newQuery.name,
          sybase_query: newQuery.sybase_query,
          created_by: localStorage.getItem('userId'), // Use the logged-in user's ID
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      if (response.data.success) {
        toast.success('Query created successfully');
        // Refresh the list of queries
        const updatedQueries = await axios.get('/query/predefined', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setQueries(updatedQueries.data.data);
        setNewQuery({ name: '', sybase_query: '' }); // Clear the form
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Failed to create query');
    }
  };

  // Handle editing a query (admin-only)
  const handleEditQuery = (query) => {
    setEditQuery(query); // Set the query to be edited
  };

  // Save changes to a query (admin-only)
  const handleSaveQuery = async () => {
    if (!editQuery) return;

    try {
      const response = await axios.put(
        `/query/update/${editQuery.id}`,
        {
          sybase_query: editQuery.sybase_query, // Only update the Sybase query
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      if (response.data.success) {
        toast.success('Query updated successfully');
        // Refresh the list of queries
        const updatedQueries = await axios.get('/query/predefined', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setQueries(updatedQueries.data.data);
        setEditQuery(null); // Clear edit mode
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Failed to update query');
    }
  };

  // Handle deleting a query (admin-only)
  const handleDeleteQuery = async (id) => {
    try {
      const response = await axios.delete(`/query/delete/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        toast.success('Query deleted successfully');
        // Refresh the list of queries
        const updatedQueries = await axios.get('/query/predefined', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setQueries(updatedQueries.data.data);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Failed to delete query');
    }
  };

  return (
    <div className="container">
      <h2>{isAdmin ? 'Admin Queries' : 'User Queries'}</h2>

      {/* Query form (available to all users) */}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="query">Query:</label>
          <select
            id="query"
            value={selectedQuery}
            onChange={(e) => setSelectedQuery(e.target.value)}
            required
          >
            <option value="">Select a query</option>
            {queries.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="database">Sybase Database:</label>
          <select
            id="database"
            value={selectedDatabase}
            onChange={(e) => setSelectedDatabase(e.target.value)}
            required
          >
            <option value="">Select a database</option>
            {sybaseDatabases.map((db) => (
              <option key={db.id} value={db.id}>
                {db.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="startDate">Start Date:</label>
          <DatePicker
            id="startDate"
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            timeCaption="Time"
            dateFormat="MMMM d, yyyy h:mm aa"
            placeholderText="Select start date and time"
            isClearable
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="endDate">End Date:</label>
          <DatePicker
            id="endDate"
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            timeCaption="Time"
            dateFormat="MMMM d, yyyy h:mm aa"
            placeholderText="Select end date and time"
            isClearable
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Running...' : 'Run Query'}
        </button>
      </form>

      {/* Admin-only actions */}
      {isAdmin && (
        <div className="admin-actions">
          <h3>Admin Actions</h3>
          <div>
            <h4>Create New Query</h4>
            <input
              type="text"
              placeholder="Query Name"
              value={newQuery.name}
              onChange={(e) => setNewQuery({ ...newQuery, name: e.target.value })}
            />
            <textarea
              placeholder="Sybase Query"
              value={newQuery.sybase_query}
              onChange={(e) => setNewQuery({ ...newQuery, sybase_query: e.target.value })}
            />
            <button onClick={handleCreateQuery}>Create Query</button>
          </div>
          <div>
            <h4>Edit Selected Query</h4>
            <button onClick={() => handleEditQuery(queries.find(q => q.id === parseInt(selectedQuery)))} disabled={!selectedQuery}>
              Edit Selected Query
            </button>
          </div>
          <div>
            <h4>Delete Selected Query</h4>
            <button onClick={() => handleDeleteQuery(selectedQuery)} disabled={!selectedQuery}>
              Delete Selected Query
            </button>
          </div>
        </div>
      )}

      {/* Edit query modal (admin-only) */}
      {editQuery && (
        <div className="edit-modal">
          <h3>Edit Query</h3>
          <div className="form-group">
            <label htmlFor="editQuery">Sybase Query:</label>
            <textarea
              id="editQuery"
              value={editQuery.sybase_query}
              onChange={(e) => setEditQuery({ ...editQuery, sybase_query: e.target.value })}
            />
          </div>
          <button onClick={handleSaveQuery}>Save Changes</button>
          <button onClick={() => setEditQuery(null)}>Cancel</button>
        </div>
      )}

      {/* Query results table (available to all users) */}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Date</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{new Date(row.date).toLocaleString()}</td>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserQueries;