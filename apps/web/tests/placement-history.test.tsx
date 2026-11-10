import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OBJECT_DESK } from '@/components/world-objects/object-fixtures';
import type { DeskCard, SpatialState } from '@/lib/world/model';

const actions = vi.hoisted(() => Object.fromEntries(['captureCardAction','changeCollectionAction','editCardBodyAction','editRepresentationAction','moveCardsAction','moveCollectionCardsAction','restoreCompositionAction','referenceObjectsAction','removeCardsAction','removeCollectionCardsAction','removeClaimAction','representObjectAction','searchWorldAction','setClaimAction','settleTruthAction'].map(key => [key, vi.fn()])));
vi.mock('@/app/actions', () => actions);
const { useDesk } = await import('@/components/desk/use-desk');
let cards: readonly DeskCard[];
let spatial: SpatialState;
beforeEach(() => {
  vi.clearAllMocks();
  cards = structuredClone(OBJECT_DESK.cards.slice(0, 3));
  spatial = { version: 1, collections: [{ id: 'research', title: 'Research', collapsed: true, cardIds: cards.map(card=>card.cardId), anchor: {x:-500,y:-200} }] };
  const applyMoves = (moves: readonly Record<string, unknown>[]) => {
    const moved = moves.map(move => {
      const card = cards.find(card=>card.cardId===move.cardId)!;
      return {...card, layout:{...card.layout,x:move.x as number,y:move.y as number,width:move.width as number??card.layout.width,height:move.height as number??card.layout.height}, z:move.z as number??card.z, presentation:move.tint===undefined?card.presentation:{tint:move.tint as NonNullable<DeskCard['presentation']>['tint']},cardVersion:card.cardVersion+1};
    });
    cards = cards.map(card=>moved.find(item=>item.cardId===card.cardId)??card);
    return moved;
  };
  actions.moveCardsAction!.mockImplementation(async input=>({state:'ok',data:applyMoves(input.moves)}));
  actions.moveCollectionCardsAction!.mockImplementation(async input=>({state:'ok',data:{cards:applyMoves(input.moves),spatial}}));
  actions.restoreCompositionAction!.mockImplementation(async input=>{
    spatial={...input.spatial,version:spatial.version+1};
    return {state:'ok',data:{cards:applyMoves(input.moves),spatial}};
  });
});
const ready = async (result: {current: ReturnType<typeof useDesk>}) => waitFor(()=>expect(result.current.sync.kind).toBe('settled'));

describe('Board presentation history',()=>{
  it('persists undo and redo without overwriting newer World Object prose or identity',async()=>{
    const {result}=renderHook(()=>useDesk({...OBJECT_DESK,cards,spatial}));
    const id=cards[0]!.cardId;
    act(()=>{result.current.resizeCard(id,400,280);}); await ready(result);
    act(()=>{result.current.setCardTint([id],'sage');}); await ready(result);
    act(()=>{result.current.absorbExternal({kind:'cards',cards:[{...result.current.byId.get(id)!,body:'A later passage must survive composition undo.',bodyVersion:9}]});});
    await act(async()=>{expect(await result.current.undo()).toBe(true);});
    expect(result.current.byId.get(id)?.presentation?.tint??null).toBe(null);
    expect(result.current.byId.get(id)?.layout.width).toBe(400);
    expect(result.current.byId.get(id)?.body).toBe('A later passage must survive composition undo.');
    expect(result.current.byId.get(id)?.objectId).toBe(cards[0]!.objectId);
    await act(async()=>{expect(await result.current.redo()).toBe(true);});
    expect(result.current.byId.get(id)?.presentation?.tint).toBe('sage');
    expect(result.current.byId.get(id)?.bodyVersion).toBe(9);
    expect(actions.restoreCompositionAction).toHaveBeenCalledTimes(2);
  });
  it('expands and arranges a stack in one reversible operation while keeping intentional sizes',async()=>{
    const original=structuredClone(cards);
    const {result}=renderHook(()=>useDesk({...OBJECT_DESK,cards,spatial}));
    act(()=>{result.current.arrangeCards(cards.map(card=>card.cardId),new Map(cards.map(card=>[card.cardId,{width:500,height:600}])));}); await ready(result);
    expect(result.current.spatial.collections[0]?.collapsed).toBe(false);
    expect(result.current.cards.map(card=>[card.layout.width,card.layout.height])).toEqual(original.map(card=>[card.layout.width,card.layout.height]));
    expect(result.current.cards[1]!.layout.x-result.current.cards[0]!.layout.x).toBe(532);
    await act(async()=>{expect(await result.current.undo()).toBe(true);});
    expect(result.current.cards.map(card=>card.layout)).toEqual(original.map(card=>card.layout));
    expect(result.current.spatial.collections[0]?.collapsed).toBe(true);
  });
  it('keeps current presentation and history after a refused restoration',async()=>{
    const {result}=renderHook(()=>useDesk({...OBJECT_DESK,cards,spatial}));
    const id=cards[0]!.cardId;
    act(()=>{result.current.resizeCard(id,400,280);}); await ready(result);
    actions.restoreCompositionAction!.mockResolvedValueOnce({state:'refused',reason:'This Board changed elsewhere.'});
    await act(async()=>{expect(await result.current.undo()).toBe(false);});
    expect(result.current.byId.get(id)?.layout.width).toBe(400);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.sync.kind).toBe('problem');
  });
  it('cancels a drag without creating an undo step or consuming the next gesture',()=>{
    const {result}=renderHook(()=>useDesk({...OBJECT_DESK,cards,spatial}));
    const id=cards[0]!.cardId;
    act(()=>{result.current.nudge([id],40,20);result.current.nudge([id],-40,-20);result.current.cancelMove();});
    expect(result.current.canUndo).toBe(false);
    act(()=>{result.current.nudge([id],8,0);});
    expect(result.current.canUndo).toBe(true);
  });
  it('persists whole-collection keyboard movement through the anchor-aware operation',async()=>{
    const {result}=renderHook(()=>useDesk({...OBJECT_DESK,cards,spatial}));
    const ids=cards.map(card=>card.cardId);
    act(()=>{result.current.nudge(ids,8,0);result.current.commitMove(ids);}); await ready(result);
    expect(actions.moveCollectionCardsAction).toHaveBeenCalledWith(expect.objectContaining({preserveMembership:true,observedSpatialVersion:1}));
    expect(actions.moveCardsAction).not.toHaveBeenCalled();
  });
});
