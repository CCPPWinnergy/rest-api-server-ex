const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Environment variables
const PORT = process.env.PORT || 3000;

// Database configuration from environment
const dbConfig = {
  host: process.env.DB_HOST || '137.184.249.112',
  port: process.env.DB_PORT || 37203,
  user: process.env.DB_USER || 'pca_user2',
  password: process.env.DB_PASSWORD || 'FfR4NODjJNRtk2KY',
  database: process.env.DB_NAME || 'ccppos'
};

// ตั้งค่า PostgreSQL
const pool = new Pool(dbConfig);

// 1. Employee Data API
app.get('/employees', async (req, res) => {
  const SQL_QUERY = `
    SELECT c.name as company_name, d.name as department_name, 
           e.name as employee_name, e.work_email as email
    FROM hr_employee as e
    LEFT JOIN res_company as c ON c.id = e.company_id
    LEFT JOIN hr_department as d ON d.id = e.department_id
    WHERE e.active = true
  `;

  try {
    const result = await pool.query(SQL_QUERY);
    const filteredData = result.rows.filter(emp => 
      emp.company_name !== 'V2 Logistics Co., LTD.' && emp.email
    );
    res.json({ status: 'success', data: filteredData });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ status: 'error', message: err.toString() });
  }
});

// 2. Sales Opportunities API
app.get('/sales-opportunities', async (req, res) => {
  const SQL_QUERY = `
    SELECT
        o.name,
        p.name  AS customer,
        sp.name AS owner,
        emp.sale_name,
        o.note  AS subject,
        d.name  AS dep_name,
        o.expected_revenue,
        o.probability,
        o.expected_closing,
        sta.name AS stage_name
    FROM ccpp_crm_opt AS o
    LEFT JOIN res_partner AS p
           ON p.id = o.customer_id
    LEFT JOIN hr_department AS d
           ON d.id = o.department_id
    LEFT JOIN ccpp_crm_opt_stage AS sta
           ON sta.id = o.stage_id
    LEFT JOIN salesperson AS sp
           ON sp.id = o.owner_id
    LEFT JOIN (
        SELECT
            os.ccpp_crm_opt_id,
            array_to_string(
                array_agg(e.name ORDER BY e.name),
                ', '
            ) AS sale_name
        FROM ccpp_crm_opt_hr_employee_rel AS os
        JOIN hr_employee AS e
              ON e.id = os.hr_employee_id
        GROUP BY
            os.ccpp_crm_opt_id
    ) AS emp
           ON emp.ccpp_crm_opt_id = o.id
  `;

  try {
    const result = await pool.query(SQL_QUERY);
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ status: 'error', message: err.toString() });
  }
});

// 3. Pain Points API
app.get('/pain-points', async (req, res) => {
  const SQL_QUERY = `
    SELECT
        p.name,
        u.name AS assignee,
        d.name AS department,
        CASE
            WHEN c."no" IS NOT NULL THEN (('[' || c."no") || '] ') || c.name
            ELSE c.name
        END AS customer,
        p.type,
        o.name AS opportunity,
        pp.name AS project,
        p.create_date
    FROM
        ccpp_pain_point p
        LEFT JOIN hr_employee u ON u.user_id = p.user_id
        LEFT JOIN res_partner c ON c.id = p.customer_id
        LEFT JOIN ccpp_crm_opt o ON o.id = p.opt_id
        LEFT JOIN ccpp_ext_project pp ON pp.id = p.project_id
        LEFT JOIN hr_department d ON d.id = u.department_id
  `;

  try {
    const result = await pool.query(SQL_QUERY);
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ status: 'error', message: err.toString() });
  }
});

// Main API endpoint
app.get('/api', async (req, res) => {
  try {
    // 1. ดึงข้อมูล Employees
    const employeeQuery = `
      SELECT c.name as company_name, d.name as department_name, 
             e.name as employee_name, e.work_email as email
      FROM hr_employee as e
      LEFT JOIN res_company as c ON c.id = e.company_id
      LEFT JOIN hr_department as d ON d.id = e.department_id
      WHERE e.active = true
    `;
    
    // 2. ดึงข้อมูล Sales Opportunities
    const salesQuery = `
      SELECT
          o.name,
          p.name  AS customer,
          sp.name AS owner,
          emp.sale_name,
          o.note  AS subject,
          d.name  AS dep_name,
          o.expected_revenue,
          o.probability,
          o.expected_closing,
          sta.name AS stage_name
      FROM ccpp_crm_opt AS o
      LEFT JOIN res_partner AS p
             ON p.id = o.customer_id
      LEFT JOIN hr_department AS d
             ON d.id = o.department_id
      LEFT JOIN ccpp_crm_opt_stage AS sta
             ON sta.id = o.stage_id
      LEFT JOIN salesperson AS sp
             ON sp.id = o.owner_id
      LEFT JOIN (
          SELECT
              os.ccpp_crm_opt_id,
              array_to_string(
                  array_agg(e.name ORDER BY e.name),
                  ', '
              ) AS sale_name
          FROM ccpp_crm_opt_hr_employee_rel AS os
          JOIN hr_employee AS e
                ON e.id = os.hr_employee_id
          GROUP BY
              os.ccpp_crm_opt_id
      ) AS emp
             ON emp.ccpp_crm_opt_id = o.id
    `;
    
    // 3. ดึงข้อมูล Pain Points
    const painPointQuery = `
      SELECT
          p.name,
          u.name AS assignee,
          d.name AS department,
          CASE
              WHEN c."no" IS NOT NULL THEN (('[' || c."no") || '] ') || c.name
              ELSE c.name
          END AS customer,
          p.type,
          o.name AS opportunity,
          pp.name AS project,
          p.create_date
      FROM
          ccpp_pain_point p
          LEFT JOIN hr_employee u ON u.user_id = p.user_id
          LEFT JOIN res_partner c ON c.id = p.customer_id
          LEFT JOIN ccpp_crm_opt o ON o.id = p.opt_id
          LEFT JOIN ccpp_ext_project pp ON pp.id = p.project_id
          LEFT JOIN hr_department d ON d.id = u.department_id
    `;
    
    const [employeeResult, salesResult, painPointResult] = await Promise.all([
      pool.query(employeeQuery),
      pool.query(salesQuery),
      pool.query(painPointQuery)
    ]);
    
    // กรองข้อมูล Employee (ออก V2 Logistics และคนไม่มีอีเมล)
    const filteredEmployees = employeeResult.rows.filter(emp => 
      emp.company_name !== 'V2 Logistics Co., LTD.' && emp.email
    );
    
    // Transform ข้อมูลให้ตรงกับฟอร์มตัวอย่าง
    const employeeData = filteredEmployees.map(emp => ({
      'Company': emp.company_name,
      'Department': emp.department_name || '',
      'Division': '',
      'Employee Name': emp.employee_name,
      'Employment Type': '',
      'Job Position': '',
      'Work Email': emp.email
    }));
    
    const ccppData = painPointResult.rows.map(row => ({
      'Create Date': row.create_date,
      'Assignee': row.assignee || '',
      'Customer': row.customer || '',
      'Name': row.name || '',
      'Type': row.type || '',
      'Opportunity': row.opportunity || '',
      'Opportunity/Stage': '',
      'Opportunity/Strategy': '',
      'Strategies': '',
      'Opportunity/Solutions': ''
    }));
    
    const opportunityData = salesResult.rows.map(row => ({
      'Completed': 0,
      'Customer': row.customer || '',
      'Date': null,
      'Note': row.subject || '',
      'Department': row.dep_name || '',
      'Expected Closing': row.expected_closing,
      'Expected Revenue': row.expected_revenue || 0,
      'GP': 0,
      'GP %': 0,
      'Name': row.name || '',
      'Owner': row.owner || '',
      'Parent': '',
      'Populated On': 0,
      'Probability': row.probability || 0,
      'Sales Person': row.sale_name || '',
      'Stage': row.stage_name || ''
    }));
    
    res.json({ 
      status: 'success', 
      data: {
        employeeData,
        ccppData,
        opportunityData
      }
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ status: 'error', message: err.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export for Vercel
module.exports = app;