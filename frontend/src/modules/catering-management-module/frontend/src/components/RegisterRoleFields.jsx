export function RegisterRoleFields({
  registerRole,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  nationalId,
  setNationalId,
  studentAge,
  setStudentAge,
  fullName,
  setFullName,
  registerUniversityId,
  setRegisterUniversityId,
  registerOptions,
  organizationName,
  setOrganizationName,
  partnerCompanyName,
  setPartnerCompanyName,
  brandName,
  setBrandName,
  productCategory,
  setProductCategory,
  digitsOnly,
}) {
  return (
    <>
      {registerRole === "STUDENT" ? (
        <>
          <div className="input-group">
            <label>Ad</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ahmet"
            />
          </div>
          <div className="input-group">
            <label>Soyad</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Yılmaz"
            />
          </div>
          <div className="input-group">
            <label>T.C. Kimlik No (sadece öğrenci)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={11}
              value={nationalId}
              onChange={(e) => setNationalId(digitsOnly(e.target.value, 11))}
              placeholder="11 haneli kimlik no"
            />
          </div>
          <div className="input-group">
            <label>Yaş</label>
            <input
              type="number"
              min="0"
              value={studentAge}
              onChange={(e) => setStudentAge(e.target.value)}
              placeholder="20"
            />
          </div>
        </>
      ) : (
        <div className="input-group">
          <label>{registerRole === "PARTNER_COMPANY" ? "Yetkili Ad Soyad" : "Ad Soyad"}</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          placeholder="Ahmet Yılmaz"
          />
        </div>
      )}

      {["UNIVERSITY_ADMIN", "STUDENT"].includes(registerRole) && (
        <div className="input-group">
          <label>Üniversite</label>
          <select
            value={registerUniversityId}
            onChange={(e) => setRegisterUniversityId(e.target.value)}
          >
            <option value="">Üniversite seçin</option>
            {registerOptions.universities.map((university) => (
              <option key={university.id} value={university.id}>
                {university.university_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {registerRole === "RESEARCHER" && (
        <div className="input-group">
          <label>Kurum / Üniversite</label>
          <input
            type="text"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            placeholder="Araştırma kurumunuz"
          />
        </div>
      )}

      {registerRole === "PARTNER_COMPANY" && (
        <>
          <div className="input-group">
            <label>Partner Firma Adı</label>
            <input
              type="text"
              value={partnerCompanyName}
              onChange={(e) => setPartnerCompanyName(e.target.value)}
              placeholder="Tedarikçi firma"
            />
          </div>
          <div className="input-group">
            <label>Marka Adı</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Marka"
            />
          </div>
          <div className="input-group">
            <label>Ürün Kategorisi (opsiyonel)</label>
            <input
              type="text"
              value={productCategory}
              onChange={(e) => setProductCategory(e.target.value)}
              placeholder="Süt ürünleri, atıştırmalık..."
            />
          </div>
        </>
      )}
    </>
  );
}
