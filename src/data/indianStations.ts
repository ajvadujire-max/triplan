/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RailwayStation {
  code: string;
  name: string;
  state: string;
  city?: string;
}

export const INDIAN_RAILWAY_STATIONS: RailwayStation[] = [
  // Karnataka & South Western Railway
  { code: "KBPR", name: "Kabaka Puttur", state: "Karnataka", city: "Puttur" },
  { code: "SBC", name: "KSR Bengaluru City", state: "Karnataka", city: "Bengaluru" },
  { code: "YPR", name: "Yesvantpur Junction", state: "Karnataka", city: "Bengaluru" },
  { code: "SMVB", name: "Sir M. Visvesvaraya Terminal Bengaluru", state: "Karnataka", city: "Bengaluru" },
  { code: "BNC", name: "Bengaluru Cantt", state: "Karnataka", city: "Bengaluru" },
  { code: "KJM", name: "Krishnarajapuram", state: "Karnataka", city: "Bengaluru" },
  { code: "MYS", name: "Mysuru Junction", state: "Karnataka", city: "Mysuru" },
  { code: "MAQ", name: "Mangaluru Central", state: "Karnataka", city: "Mangaluru" },
  { code: "MAJN", name: "Mangaluru Junction", state: "Karnataka", city: "Mangaluru" },
  { code: "UD", name: "Udupi", state: "Karnataka", city: "Udupi" },
  { code: "UBL", name: "SSS Hubballi Junction", state: "Karnataka", city: "Hubballi" },
  { code: "BGM", name: "Belagavi", state: "Karnataka", city: "Belagavi" },
  { code: "BAY", name: "Ballari Junction", state: "Karnataka", city: "Ballari" },
  { code: "DVG", name: "Davangere", state: "Karnataka", city: "Davangere" },
  { code: "ASK", name: "Arsikere Junction", state: "Karnataka", city: "Arsikere" },
  { code: "RRB", name: "Birur Junction", state: "Karnataka", city: "Birur" },
  { code: "SMET", name: "Shivamogga Town", state: "Karnataka", city: "Shivamogga" },
  { code: "BWT", name: "Bangarapet Junction", state: "Karnataka", city: "Bangarapet" },
  { code: "SLI", name: "Sakleshpur", state: "Karnataka", city: "Sakleshpur" },
  { code: "SLN", name: "Subrahmanya Road", state: "Karnataka", city: "Subrahmanya" },
  { code: "BNTL", name: "Bantawala", state: "Karnataka", city: "Bantwal" },

  // Kerala & Southern Railway
  { code: "CAN", name: "Kannur", state: "Kerala", city: "Kannur" },
  { code: "KGQ", name: "Kasaragod", state: "Kerala", city: "Kasaragod" },
  { code: "CLT", name: "Kozhikode Main", state: "Kerala", city: "Kozhikode" },
  { code: "ERS", name: "Ernakulam Junction (South)", state: "Kerala", city: "Kochi" },
  { code: "ERN", name: "Ernakulam Town (North)", state: "Kerala", city: "Kochi" },
  { code: "TVC", name: "Thiruvananthapuram Central", state: "Kerala", city: "Thiruvananthapuram" },
  { code: "TCR", name: "Thrissur", state: "Kerala", city: "Thrissur" },
  { code: "PGT", name: "Palakkad Junction", state: "Kerala", city: "Palakkad" },
  { code: "QLN", name: "Kollam Junction", state: "Kerala", city: "Kollam" },
  { code: "KTYM", name: "Kottayam", state: "Kerala", city: "Kottayam" },
  { code: "ALLP", name: "Alappuzha", state: "Kerala", city: "Alappuzha" },
  { code: "SRR", name: "Shoranur Junction", state: "Kerala", city: "Shoranur" },
  { code: "TLY", name: "Thalassery", state: "Kerala", city: "Thalassery" },
  { code: "PAY", name: "Payyanur", state: "Kerala", city: "Payyanur" },
  { code: "KZE", name: "Kanhangad", state: "Kerala", city: "Kanhangad" },
  { code: "MDF", name: "Madannoor", state: "Kerala", city: "Madannoor" },

  // Tamil Nadu
  { code: "MAS", name: "Chennai Central", state: "Tamil Nadu", city: "Chennai" },
  { code: "MS", name: "Chennai Egmore", state: "Tamil Nadu", city: "Chennai" },
  { code: "CBE", name: "Coimbatore Junction", state: "Tamil Nadu", city: "Coimbatore" },
  { code: "MDU", name: "Madurai Junction", state: "Tamil Nadu", city: "Madurai" },
  { code: "KPD", name: "Katpadi Junction", state: "Tamil Nadu", city: "Vellore" },
  { code: "TPJ", name: "Tiruchchirappalli Junction", state: "Tamil Nadu", city: "Tiruchirappalli" },
  { code: "SA", name: "Salem Junction", state: "Tamil Nadu", city: "Salem" },
  { code: "ED", name: "Erode Junction", state: "Tamil Nadu", city: "Erode" },
  { code: "TEN", name: "Tirunelveli Junction", state: "Tamil Nadu", city: "Tirunelveli" },
  { code: "NCJ", name: "Nagercoil Junction", state: "Tamil Nadu", city: "Nagercoil" },
  { code: "RMM", name: "Rameswaram", state: "Tamil Nadu", city: "Rameswaram" },

  // Goa & Konkan Railway
  { code: "MAO", name: "Madgaon Junction", state: "Goa", city: "Margao" },
  { code: "KRMI", name: "Karmali", state: "Goa", city: "Panaji" },
  { code: "THVM", name: "Thivim", state: "Goa", city: "Mapusa" },
  { code: "RN", name: "Ratnagiri", state: "Maharashtra", city: "Ratnagiri" },
  { code: "KUDL", name: "Kudal", state: "Maharashtra", city: "Kudal" },

  // Maharashtra & Central/Western Railway
  { code: "KYN", name: "Kalyan Junction", state: "Maharashtra", city: "Kalyan" },
  { code: "CSMT", name: "Chhatrapati Shivaji Maharaj Terminus", state: "Maharashtra", city: "Mumbai" },
  { code: "MMCT", name: "Mumbai Central", state: "Maharashtra", city: "Mumbai" },
  { code: "LTT", name: "Lokmanya Tilak Terminus", state: "Maharashtra", city: "Mumbai" },
  { code: "BCT", name: "Mumbai Central (BCT)", state: "Maharashtra", city: "Mumbai" },
  { code: "DR", name: "Dadar Central", state: "Maharashtra", city: "Mumbai" },
  { code: "TNA", name: "Thane", state: "Maharashtra", city: "Thane" },
  { code: "PUNE", name: "Pune Junction", state: "Maharashtra", city: "Pune" },
  { code: "NGP", name: "Nagpur Junction", state: "Maharashtra", city: "Nagpur" },
  { code: "NK", name: "Nashik Road", state: "Maharashtra", city: "Nashik" },
  { code: "SUR", name: "Solapur Junction", state: "Maharashtra", city: "Solapur" },
  { code: "KOP", name: "Kolhapur CSMT", state: "Maharashtra", city: "Kolhapur" },
  { code: "JL", name: "Jalgaon Junction", state: "Maharashtra", city: "Jalgaon" },
  { code: "BSL", name: "Bhusaval Junction", state: "Maharashtra", city: "Bhusaval" },

  // Delhi NCR & Northern Railway
  { code: "NDLS", name: "New Delhi", state: "Delhi", city: "New Delhi" },
  { code: "DLI", name: "Old Delhi Junction", state: "Delhi", city: "Delhi" },
  { code: "NZM", name: "Hazrat Nizamuddin", state: "Delhi", city: "New Delhi" },
  { code: "ANVT", name: "Anand Vihar Terminal", state: "Delhi", city: "Delhi" },
  { code: "DEE", name: "Delhi Sarai Rohilla", state: "Delhi", city: "Delhi" },
  { code: "GZB", name: "Ghaziabad Junction", state: "Uttar Pradesh", city: "Ghaziabad" },

  // Uttar Pradesh & North Central / North Eastern Railway
  { code: "CNB", name: "Kanpur Central", state: "Uttar Pradesh", city: "Kanpur" },
  { code: "LKO", name: "Lucknow Charbagh", state: "Uttar Pradesh", city: "Lucknow" },
  { code: "LJN", name: "Lucknow NE", state: "Uttar Pradesh", city: "Lucknow" },
  { code: "BSB", name: "Varanasi Junction", state: "Uttar Pradesh", city: "Varanasi" },
  { code: "PRYJ", name: "Prayagraj Junction (Allahabad)", state: "Uttar Pradesh", city: "Prayagraj" },
  { code: "AGC", name: "Agra Cantt", state: "Uttar Pradesh", city: "Agra" },
  { code: "AF", name: "Agra Fort", state: "Uttar Pradesh", city: "Agra" },
  { code: "GKP", name: "Gorakhpur Junction", state: "Uttar Pradesh", city: "Gorakhpur" },
  { code: "MTJ", name: "Mathura Junction", state: "Uttar Pradesh", city: "Mathura" },
  { code: "MB", name: "Moradabad Junction", state: "Uttar Pradesh", city: "Moradabad" },

  // Bihar & East Central Railway
  { code: "KIR", name: "Katihar Junction", state: "Bihar", city: "Katihar" },
  { code: "PNBE", name: "Patna Junction", state: "Bihar", city: "Patna" },
  { code: "PPTA", name: "Patliputra Junction", state: "Bihar", city: "Patna" },
  { code: "GAYA", name: "Gaya Junction", state: "Bihar", city: "Gaya" },
  { code: "MFP", name: "Muzaffarpur Junction", state: "Bihar", city: "Muzaffarpur" },
  { code: "DBG", name: "Darbhanga Junction", state: "Bihar", city: "Darbhanga" },
  { code: "DBG", name: "Barauni Junction", state: "Bihar", city: "Barauni" },

  // West Bengal & Eastern / South Eastern Railway
  { code: "HWH", name: "Howrah Junction", state: "West Bengal", city: "Kolkata" },
  { code: "SDAH", name: "Sealdah", state: "West Bengal", city: "Kolkata" },
  { code: "KOAA", name: "Kolkata Chitpur", state: "West Bengal", city: "Kolkata" },
  { code: "SHM", name: "Shalimar", state: "West Bengal", city: "Howrah" },
  { code: "NJP", name: "New Jalpaiguri Junction", state: "West Bengal", city: "Siliguri" },
  { code: "KGP", name: "Kharagpur Junction", state: "West Bengal", city: "Kharagpur" },
  { code: "ASN", name: "Asansol Junction", state: "West Bengal", city: "Asansol" },

  // Gujarat & Western Railway
  { code: "ADI", name: "Ahmedabad Junction", state: "Gujarat", city: "Ahmedabad" },
  { code: "ST", name: "Surat", state: "Gujarat", city: "Surat" },
  { code: "BRC", name: "Vadodara Junction", state: "Gujarat", city: "Vadodara" },
  { code: "RJT", name: "Rajkot Junction", state: "Gujarat", city: "Rajkot" },
  { code: "BVC", name: "Bhavnagar Terminus", state: "Gujarat", city: "Bhavnagar" },
  { code: "OKHA", name: "Okha", state: "Gujarat", city: "Okha" },

  // Rajasthan & North Western Railway
  { code: "JP", name: "Jaipur Junction", state: "Rajasthan", city: "Jaipur" },
  { code: "JU", name: "Jodhpur Junction", state: "Rajasthan", city: "Jodhpur" },
  { code: "UDZ", name: "Udaipur City", state: "Rajasthan", city: "Udaipur" },
  { code: "AII", name: "Ajmer Junction", state: "Rajasthan", city: "Ajmer" },
  { code: "KOTA", name: "Kota Junction", state: "Rajasthan", city: "Kota" },
  { code: "BKN", name: "Bikaner Junction", state: "Rajasthan", city: "Bikaner" },

  // Telangana & Andhra Pradesh
  { code: "SC", name: "Secunderabad Junction", state: "Telangana", city: "Hyderabad" },
  { code: "HYB", name: "Hyderabad Deccan", state: "Telangana", city: "Hyderabad" },
  { code: "KCG", name: "Kacheguda", state: "Telangana", city: "Hyderabad" },
  { code: "BZA", name: "Vijayawada Junction", state: "Andhra Pradesh", city: "Vijayawada" },
  { code: "VSKP", name: "Visakhapatnam Junction", state: "Andhra Pradesh", city: "Visakhapatnam" },
  { code: "TPTY", name: "Tirupati", state: "Andhra Pradesh", city: "Tirupati" },
  { code: "RU", name: "Renigunta Junction", state: "Andhra Pradesh", city: "Tirupati" },
  { code: "GNT", name: "Guntur Junction", state: "Andhra Pradesh", city: "Guntur" },
  { code: "RJY", name: "Rajahmundry", state: "Andhra Pradesh", city: "Rajahmundry" },

  // Madhya Pradesh & Central / West Central Railway
  { code: "BPL", name: "Bhopal Junction", state: "Madhya Pradesh", city: "Bhopal" },
  { code: "RKMP", name: "Rani Kamalapati (Habibganj)", state: "Madhya Pradesh", city: "Bhopal" },
  { code: "INDB", name: "Indore Junction", state: "Madhya Pradesh", city: "Indore" },
  { code: "GWL", name: "Gwalior Junction", state: "Madhya Pradesh", city: "Gwalior" },
  { code: "JBP", name: "Jabalpur Junction", state: "Madhya Pradesh", city: "Jabalpur" },
  { code: "UJN", name: "Ujjain Junction", state: "Madhya Pradesh", city: "Ujjain" },

  // Punjab, Haryana & Jammu & Kashmir
  { code: "CDG", name: "Chandigarh Junction", state: "Chandigarh", city: "Chandigarh" },
  { code: "ASR", name: "Amritsar Junction", state: "Punjab", city: "Amritsar" },
  { code: "LDH", name: "Ludhiana Junction", state: "Punjab", city: "Ludhiana" },
  { code: "JAT", name: "Jammu Tawi", state: "Jammu & Kashmir", city: "Jammu" },
  { code: "SVDK", name: "Shri Mata Vaishno Devi Katra", state: "Jammu & Kashmir", city: "Katra" },
  { code: "UMB", name: "Ambala Cantt Junction", state: "Haryana", city: "Ambala" },

  // Odisha & Eastern Coast Railway
  { code: "BBS", name: "Bhubaneswar", state: "Odisha", city: "Bhubaneswar" },
  { code: "PURI", name: "Puri", state: "Odisha", city: "Puri" },
  { code: "CTC", name: "Cuttack Junction", state: "Odisha", city: "Cuttack" },
  { code: "ROU", name: "Rourkela Junction", state: "Odisha", city: "Rourkela" },

  // Assam & North East
  { code: "GHY", name: "Guwahati", state: "Assam", city: "Guwahati" },
  { code: "KYQ", name: "Kamakhya Junction", state: "Assam", city: "Guwahati" },
  { code: "DBRG", name: "Dibrugarh", state: "Assam", city: "Dibrugarh" },

  // Chhattisgarh & Jharkhand
  { code: "R", name: "Raipur Junction", state: "Chhattisgarh", city: "Raipur" },
  { code: "BSP", name: "Bilaspur Junction", state: "Chhattisgarh", city: "Bilaspur" },
  { code: "RNC", name: "Ranchi Junction", state: "Jharkhand", city: "Ranchi" },
  { code: "DHN", name: "Dhanbad Junction", state: "Jharkhand", city: "Dhanbad" },
  { code: "TATA", name: "Tatanagar Junction", state: "Jharkhand", city: "Jamshedpur" },

  // Uttarakhand & Himachal Pradesh
  { code: "DDN", name: "Dehradun", state: "Uttarakhand", city: "Dehradun" },
  { code: "HW", name: "Haridwar Junction", state: "Uttarakhand", city: "Haridwar" },
  { code: "KLK", name: "Kalka", state: "Haryana", city: "Kalka" },
];

/**
 * Searches stations with fuzzy matching on name, code, state, or city
 */
export function searchRailwayStations(query: string, maxResults = 15): RailwayStation[] {
  if (!query || query.trim() === "") {
    return INDIAN_RAILWAY_STATIONS.slice(0, maxResults);
  }

  const q = query.trim().toLowerCase();

  // Exact code match or starts with code
  const exactCodeMatches = INDIAN_RAILWAY_STATIONS.filter(
    (s) => s.code.toLowerCase() === q
  );

  const codeStartMatches = INDIAN_RAILWAY_STATIONS.filter(
    (s) => s.code.toLowerCase().startsWith(q) && s.code.toLowerCase() !== q
  );

  const nameStartMatches = INDIAN_RAILWAY_STATIONS.filter(
    (s) =>
      s.name.toLowerCase().startsWith(q) &&
      !exactCodeMatches.includes(s) &&
      !codeStartMatches.includes(s)
  );

  const containsMatches = INDIAN_RAILWAY_STATIONS.filter(
    (s) =>
      (s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.state.toLowerCase().includes(q) ||
        (s.city && s.city.toLowerCase().includes(q))) &&
      !exactCodeMatches.includes(s) &&
      !codeStartMatches.includes(s) &&
      !nameStartMatches.includes(s)
  );

  const results = [
    ...exactCodeMatches,
    ...codeStartMatches,
    ...nameStartMatches,
    ...containsMatches,
  ];

  return results.slice(0, maxResults);
}
