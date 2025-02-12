"use strict";(self.webpackChunkportfolio_react=self.webpackChunkportfolio_react||[]).push([[843],{6522:(e,t,r)=>{r.r(t),r.d(t,{default:()=>G});var i=r(5043),n=r(8774),o=r(2119);r(3438);const a=o.Ay.div`
    background: linear-gradient(343.07deg, rgba(132, 59, 206, 0.06) 5.71%, rgba(132, 59, 206, 0) 64.83%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
    z-index: 1;
    align-items: center;
    clip-path: polygon(0 0, 100% 0, 100% 100%,100% 98%, 0 100%);
`,l=o.Ay.div`
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-direction: column;
    width: 100%;
    max-width: 1350px;
    padding: 10px 0px 100px 0;
    gap: 12px;
    @media (max-width: 960px) {
        flex-direction: column;
    }
`,d=o.Ay.div`
font-size: 42px;
text-align: center;
font-weight: 600;
margin-top: 20px;
  color: ${e=>{let{theme:t}=e;return t.text_primary}};
  @media (max-width: 768px) {
      margin-top: 12px;
      font-size: 32px;
  }
`,s=o.Ay.div`
    padding-bottom: 20px;
    font-size: 18px;
    text-align: center;
    max-width: 600px;
    color: ${e=>{let{theme:t}=e;return t.text_secondary}};
    @media (max-width: 768px) {
        margin-top: 12px;
        font-size: 16px;
    }
`,p=o.Ay.div`
    display: flex;
    border: 1.5px solid ${e=>{let{theme:t}=e;return t.primary}};
    color: ${e=>{let{theme:t}=e;return t.primary}};
    font-size: 16px;
    border-radius: 12px;
    font-weight: 500;
    margin: 22px 0px;
    @media (max-width: 768px) {
        font-size: 12px;
    }
`,x=o.Ay.div`
    padding: 8px 18px;
    border-radius: 6px;
    cursor: pointer;
    ${e=>{let{active:t,theme:r}=e;return t&&`\n    background: ${r.primary+20};\n    `}}
    &:hover {
        background: ${e=>{let{theme:t}=e;return t.primary+8}};
    }
    @media (max-width: 768px) {
        padding: 6px 8px;
        border-radius: 4px;
    }
`,c=o.Ay.div`
    background: ${e=>{let{theme:t}=e;return t.primary}};
`,h=o.Ay.div`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 28px;
    flex-wrap: wrap;
`;o.Ay.div`
  margin-top: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
`,o.Ay.a`
    text-align: center;
    font-size: 16px;
    font-weight: 500;
    color: ${e=>{let{theme:t}=e;return t.text_primary}};
    padding: 12px 24px;
    border-radius: 8px;
    background-color: ${e=>{let{theme:t}=e;return t.primary}};
    background: -webkit-linear-gradient(225deg, hsla(271, 100%, 50%, 1) 0%, hsla(294, 100%, 50%, 1) 100%);
    cursor: pointer;
    text-decoration: none;
    transition: all 0.5s ease;
    &:hover {
        transform: scale(1.05);
    transition: all 0.4s ease-in-out;
    box-shadow:  20px 20px 60px #1F2634;
    filter: brightness(1);
    }
    @media only screen and (max-width: 600px) {
        font-size: 14px;
    }
`;var m=r(5369),g=r(2285),u=r(579);const f=o.Ay.button`
    display: none;
    width: 100%;
    padding: 10px;
    background-color: ${e=>{let{theme:t}=e;return t.white}};
    color: ${e=>{let{theme:t}=e;return t.text_black}};
    font-size: 14px;
    font-weight: 700;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.8s ease-in-out;
`,y=o.Ay.article`
    width: 330px;
    height: 490px;
    background-color: ${e=>{let{theme:t}=e;return t.card}};
    cursor: pointer;
    border-radius: 10px;
    box-shadow: 0 0 12px 4px rgba(0, 0, 0, 0.4);
    overflow: hidden;
    padding: 26px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    transition: all 0.5s ease-in-out;
    &:hover {
        transform: translateY(-10px);
        box-shadow: 0 0 50px 4px rgba(0, 0, 0, 0.6);
        filter: brightness(1.1);
    }
    &:hover ${f} {
        display: block;
    }
`,b=o.Ay.div`
    position: relative;
    display:flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 180px;
    background-color: ${e=>{let{theme:t}=e;return t.bgLight}};
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 0 16px 2px rgba(0, 0, 0, 0.3);
`,w=o.Ay.img`
    width: 100%;
    height: 100%;
    display: ${e=>{let{isLoading:t}=e;return t?"none":"block"}};
`,j=o.Ay.div`
    width: 40px;
    height: 40px;
    border: 4px solid ${e=>{let{theme:t}=e;return t.text_secondary}};
    border-radius: 50%;
    border-top: 4px solid ${e=>{let{theme:t}=e;return t.primary}};
    animation: spin 1s linear infinite;
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`,v=o.Ay.div`
    width: 100%;
    display: flex;
    height: 52px;
    align-items: center;
    -webkit-line-clamp: 2;
    text-overflow: ellipsis;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
`,k=o.Ay.span`
    font-size: 12px;
    font-weight: 400;
    color: ${e=>{let{theme:t}=e;return t.primary}};
    background-color: ${e=>{let{theme:t}=e;return t.primary+15}};
    padding: 2px 8px;
    border-radius: 10px;
`,A=o.Ay.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 0 2px;
`,$=o.Ay.h2`
    font-size: 20px;
    font-weight: 600;
    color: ${e=>{let{theme:t}=e;return t.text_secondary}};
    overflow: hidden;
    display: -webkit-box;
    max-width: 100%;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    text-overflow: ellipsis;
`,z=o.Ay.time`
    font-size: 12px;
    margin-left: 2px;
    font-weight: 400;
    color: ${e=>{let{theme:t}=e;return t.text_secondary+80}};
    @media only screen and (max-width: 768px) {
        font-size: 10px;
    }
`,_=o.Ay.p`
    font-weight: 400;
    color: ${e=>{let{theme:t}=e;return t.text_secondary+99}};
    overflow: hidden;
    margin-top: 8px;
    display: -webkit-box;
    max-width: 100%;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    text-overflow: ellipsis;
`,C=o.Ay.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-left: 10px;
`,L=o.Ay.div`
    display: flex;
    align-items: center;
`,P=o.Ay.a`
  display: flex;
  font-size: 1.3rem;
  color: ${e=>{let{theme:t}=e;return t.text_primary}};
  transition: color 0.2s ease-in-out;
  &:hover {
    color: ${e=>{let{theme:t}=e;return t.primary}};
  }
`,F=o.Ay.div`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.9rem;
`,I=o.Ay.img`
    width: 38px;
    height: 38px;
    border-radius: 50%;
    margin-left: -10px;
    background-color: ${e=>{let{theme:t}=e;return t.white}};
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
    border: 3px solid ${e=>{let{theme:t}=e;return t.card}};
`,M=e=>{var t,r;let{project:n,setOpenModal:o}=e;const[a,l]=(0,i.useState)(!0),[d,s]=(0,i.useState)(!1);return(0,u.jsxs)(y,{onClick:()=>o({state:!0,project:n}),"aria-labelledby":`project-title-${n.id}`,role:"button",tabIndex:"0",children:[(0,u.jsxs)(b,{children:[(0,u.jsx)(w,{src:n.image,alt:`Image for project titled ${n.title}`,onLoad:()=>l(!1),onError:()=>l(!1),isLoading:a}),a&&(0,u.jsx)(j,{})]}),(0,u.jsx)(v,{children:null===(t=n.tags)||void 0===t?void 0:t.map(((e,t)=>(0,u.jsx)(k,{children:e},t)))}),(0,u.jsxs)(A,{children:[(0,u.jsx)($,{id:`project-title-${n.id}`,children:n.title}),(0,u.jsx)(z,{dateTime:n.date,children:n.date}),(0,u.jsx)(_,{children:n.description})]}),(0,u.jsxs)(C,{children:[(0,u.jsx)(L,{children:null===(r=n.member)||void 0===r?void 0:r.map(((e,t)=>(0,u.jsx)(I,{src:e.img,alt:`Profile of ${e.name}`},t)))}),(0,u.jsxs)(F,{children:[(null===n||void 0===n?void 0:n.github)&&(0,u.jsx)(P,{href:n.github,target:"_blank","aria-label":`GitHub repository for ${n.title}`,onClick:e=>{e.stopPropagation()},children:(0,u.jsx)(m.hL4,{size:24})}),(0,u.jsx)(P,{"aria-label":"Like button",onClick:e=>{e.stopPropagation(),s(!d)},children:d?(0,u.jsx)(g.Zml,{size:26,color:"red"}):(0,u.jsx)(g.EyI,{size:26})})]})]})]})};var S=r(3216);const O=r.p+"static/media/ViewAllCardImg.477c80761bfda54cfdf7.png",T=o.Ay.article`
    width: 330px;
    height: 490px;
    background-color: ${e=>{let{theme:t}=e;return t.card}};
    cursor: pointer;
    border-radius: 10px;
    box-shadow: 0 0 12px 4px rgba(0, 0, 0, 0.4);
    overflow: hidden;
    padding: 26px 20px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 14px;
    transition: all 0.5s ease-in-out;
    &:hover {
        transform: translateY(-10px);
        box-shadow: 0 0 50px 4px rgba(0, 0, 0, 0.6);
        filter: brightness(1.1);
    }
`,E=o.Ay.div`
    position: relative;
    display:flex;
    justify-content: center;
    align-items: space-evenly;
    width: 100%;
    height: 100%;
    background-color: ${e=>{let{theme:t}=e;return t.bgLight}};
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 0 16px 2px rgba(0, 0, 0, 0.3);
`,H=o.Ay.img`
    width: 100%;
    height: 100%;
`,V=o.Ay.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
`,Y=(0,o.Ay)(m.FSj)`
    color: ${e=>{let{theme:t}=e;return t.text_secondary}};
    font-size: 50px;
`,Z=o.Ay.span`
    font-size: 20px;
    font-weight: bold;
    color: ${e=>{let{theme:t}=e;return t.text_secondary}};
    text-align: center;
    padding: 1rem 0 0 0;
`;const D=function(){const e=(0,S.Zp)();return(0,u.jsxs)(T,{onClick:()=>{e("/AllProjects")},children:[(0,u.jsx)(E,{children:(0,u.jsx)(H,{src:O})}),(0,u.jsxs)(V,{children:[(0,u.jsx)(Y,{}),(0,u.jsx)(Z,{children:"View All Projects"})]})]})},G=e=>{let{projectsData:t=n.A.projects,openModal:r,setOpenModal:o,projectFilters:m,defaultfilter:g="all",AllCard:f,ShowTitle:y,IntroText:b}=e;const[w,j]=(0,i.useState)(g),v=(0,i.useMemo)((()=>{let e;e="top"===w?t.filter((e=>1===e.ontop)):"all"===w?t:t.filter((e=>e.category===w));const r=(e=>{const t=new Set;return e.filter((e=>{const r=t.has(e.id);return t.add(e.id),!r}))})(e),i=r.sort(((e,t)=>e.rank-t.rank)).reduce(((e,t)=>{const r=t.rank;return e[r]||(e[r]=[]),e[r].push(t),e}),{});return Object.values(i).flat()}),[w,t]);return(0,u.jsx)(a,{id:"projects",children:(0,u.jsxs)(l,{children:[y&&(0,u.jsx)(d,{children:"Projects"}),b&&(0,u.jsx)(s,{children:"I have worked on a wide range of projects. From machine learning to deep learning and NLP applications. Here are some of my projects."}),m&&(0,u.jsx)(p,{children:m.map((e=>(0,u.jsxs)(i.Fragment,{children:[(0,u.jsx)(x,{"aria-label":`Filter projects by ${e}`,active:w===e,value:e,onClick:()=>j(e),children:e.toUpperCase()}),(0,u.jsx)(c,{})]},e)))}),(0,u.jsxs)(h,{children:[v.map((e=>(0,u.jsx)(M,{project:e,openModal:r,setOpenModal:o},e.id))),f?(0,u.jsx)(D,{}):null]})]})})}}}]);
//# sourceMappingURL=843.71228485.chunk.js.map