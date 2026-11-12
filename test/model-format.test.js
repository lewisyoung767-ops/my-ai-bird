import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSTL,meshChecks} from '../public/model-format.js';
export function cubeSTL(){const v=[[0,0,0],[10,0,0],[10,10,0],[0,10,0],[0,0,10],[10,0,10],[10,10,10],[0,10,10]],faces=[[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]];return 'solid cube\n'+faces.map(f=>'facet normal 0 0 0\nouter loop\n'+f.map(i=>'vertex '+v[i].join(' ')).join('\n')+'\nendloop\nendfacet').join('\n')+'\nendsolid cube';}
test('data-only STL parser validates a closed cube without running generated code',()=>{const mesh=parseSTL(cubeSTL());assert.equal(mesh.triangles,12);assert.deepEqual(mesh.size,[10,10,10]);const result=meshChecks(mesh);assert.equal(result.closed,true);assert.equal(result.consistent,true);assert.equal(result.nondegenerate,true);assert.equal(result.positiveVolume,true);assert.ok(Math.abs(result.volume-1000)<1e-8);});
test('STL parser rejects malformed, oversized and non-finite input',()=>{for(const value of ['not a model','solid x\nvertex 0 0 0\nendsolid x',cubeSTL().replace('vertex 0 0 0','vertex NaN 0 0'),'x'.repeat(150001)])assert.throws(()=>parseSTL(value));});
