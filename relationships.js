// Class kids: each class has one class dad (a few have two), and everyone in that class is his kids.
// Shared by the member table and the tree's Generations view.
const kidsByMember=records.map(()=>[]);
const dadsByMember=crossings.map(([semester,cohort],id)=>classDadsBySchool[schoolIds[id]][semester+'|'+cohort]??[]);
const memberIdsByName=new Map();
for(const [id,record] of records.entries()){
  const name=normalizeMemberQuery(record[3]);
  memberIdsByName.set(name,memberIdsByName.has(name)?null:id);
}
// classDadIdsByMember: every class dad as a member id. classDadByMember: the first one, used as the
// single parent when drawing the tree (eight classes have two dads).
const classDadIdsByMember=records.map(()=>[]);
for(const [id,dads] of dadsByMember.entries()){
  const dadIds=new Set(dads.map(name=>memberIdsByName.get(normalizeMemberQuery(classDadAliases[name]??name))));
  for(const dad of dadIds){
    if(Number.isInteger(dad)){kidsByMember[dad].push(id);classDadIdsByMember[id].push(dad);}
  }
}
const classDadByMember=classDadIdsByMember.map(ids=>ids.length?ids[0]:null);
