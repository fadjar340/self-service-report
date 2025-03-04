import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './styles.css';

const AdminQueries = () => {
  const [queries, setQueries] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch predefined queries
  useEffect(() => {
    const fetchQueries = async () => {
      try {
        const response = await axios.get('/query/predefined', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setQueries(response.data);
      } catch (error) {
        toast.error('Failed to fetch predefined queries');
      }
    };
    fetchQueries();
  }, []);

  // Run query
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.get(`/query/run/${selectedQuery}`, {
        params: { startDate, endDate },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setData(response.data);
    } catch (error) {
      toast.error('Failed to execute query');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Admin Queries</h2>
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
          <label htmlFor="startDate">Start Date:</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="endDate">End Date:</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Running...' : 'Run Query'}
        </button>
      </form>
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
              <td>{row.date}</td>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminQueries;