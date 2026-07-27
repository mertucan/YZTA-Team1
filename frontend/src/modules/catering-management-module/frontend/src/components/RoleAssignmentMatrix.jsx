const ROLE_ASSIGNMENT_ROWS = [
  { role: "SUPER_ADMIN", publicRegister: false, assigner: "Super admin", approval: "Zorunlu", scope: "Sistem" },
  { role: "CATERING_ADMIN", publicRegister: true, assigner: "Super admin", approval: "Önerilir", scope: "Firma" },
  { role: "UNIVERSITY_ADMIN", publicRegister: true, assigner: "Super/Catering", approval: "Zorunlu", scope: "Üniversite" },
  { role: "DIETITIAN", publicRegister: false, assigner: "Super/Catering", approval: "İç atama", scope: "Menü" },
  { role: "CHEF", publicRegister: false, assigner: "Super/Catering", approval: "İç atama", scope: "Mutfak" },
  { role: "FINANCE_MANAGER", publicRegister: false, assigner: "Super/Catering", approval: "İç atama", scope: "Finans" },
  { role: "OPERATIONS_MANAGER", publicRegister: false, assigner: "Super/Catering", approval: "İç atama", scope: "Operasyon" },
  { role: "STUDENT", publicRegister: true, assigner: "Üniv. admin", approval: "Önerilir", scope: "Öğrenci" },
  { role: "WAREHOUSE_STAFF", publicRegister: false, assigner: "Catering", approval: "İç atama", scope: "Depo" },
  { role: "PURCHASING_STAFF", publicRegister: false, assigner: "Catering", approval: "İç atama", scope: "Satın alma" },
  { role: "RESEARCHER", publicRegister: true, assigner: "Super admin", approval: "Zorunlu", scope: "Araştırma" },
  { role: "PARTNER_COMPANY", publicRegister: true, assigner: "Super/Catering", approval: "Zorunlu", scope: "Partner" },
];

function StatusIcon({ ok }) {
  return (
    <span className={`role-check ${ok ? "yes" : "no"}`} aria-label={ok ? "Evet" : "Hayır"}>
      {ok ? "✓" : "×"}
    </span>
  );
}

function visibleRowsForRole(viewerRole) {
  if (viewerRole === "SUPER_ADMIN") return ROLE_ASSIGNMENT_ROWS;
  return ROLE_ASSIGNMENT_ROWS.filter(
    (row) => row.role !== "SUPER_ADMIN",
  );
}

export function RoleAssignmentMatrix({ roleLabels, viewerRole }) {
  const rows = visibleRowsForRole(viewerRole);
  const publicCount = rows.filter((row) => row.publicRegister).length;
  const internalCount = rows.length - publicCount;

  return (
    <section className="table-card role-assignment-matrix">
      <div className="role-matrix-hero">
        <div>
          <h3>Rol Atama Matrisi</h3>
          <p>Kayıt, atama ve onay kurallarının kısa özeti.</p>
        </div>
        <div className="role-matrix-summary">
          <span><strong>{publicCount}</strong> public</span>
          <span><strong>{internalCount}</strong> iç atama</span>
          <span><strong>{rows.length}</strong> rol</span>
        </div>
      </div>
      <div className="table-scroll">
        <table className="role-matrix-table compact">
          <thead>
            <tr>
              <th>Rol</th>
              <th>Public</th>
              <th>Atayan</th>
              <th>Onay</th>
              <th>Kapsam</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.role}>
                <td>
                  <span className={`badge badge-role ${row.role.toLowerCase()}`}>
                    {roleLabels[row.role] || row.role}
                  </span>
                </td>
                <td><StatusIcon ok={row.publicRegister} /></td>
                <td>{row.assigner}</td>
                <td>
                  <span className="role-mini-pill">{row.approval}</span>
                </td>
                <td>{row.scope}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export { ROLE_ASSIGNMENT_ROWS };
