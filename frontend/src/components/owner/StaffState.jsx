import {
    Users,
    UserCheck,
    Shield,
    UserCog
} from "lucide-react";

const stats=[
{
title:"Total Staff",
value:"18",
icon:Users
},
{
title:"Active",
value:"16",
icon:UserCheck
},
{
title:"Cashiers",
value:"12",
icon:Shield
},
{
title:"Managers",
value:"4",
icon:UserCog
},
];

export default function StaffStats(){

return(

<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

{stats.map((item,index)=>{

const Icon=item.icon;

return(

<div
key={index}
className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">

<div className="flex justify-between">

<div>

<p className="text-sm text-slate-500">
{item.title}
</p>

<h2 className="text-4xl font-bold mt-3">
{item.value}
</h2>

</div>

<div className="bg-blue-100 p-3 rounded-xl">

<Icon
size={30}
className="text-blue-700"
/>

</div>

</div>

</div>

);

})}

</div>

);

}