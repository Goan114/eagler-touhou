#include "game/Multiplayer.hpp"
#include "game/GameState.hpp"
#include "game/GameSession.hpp"
#include "game/StageFlow.hpp"
#include "multiplayer/WorldState.hpp"
#include "multiplayer/StageEntry.hpp"
#include "multiplayer/InputLanes.hpp"
#include "multiplayer/ReplayArchive.hpp"
#include "multiplayer/Session.hpp"
#include <cstdio>
#include <cstdlib>
using namespace th12;
namespace mp=th12::multiplayer;
void check(bool ok,const char* name){if(!ok){std::fprintf(stderr,"FAIL: %s\n",name);std::exit(1);}}
void begin(unsigned count=3){selectStage(1);mp::Options o;o.count=count;o.selections={0,3,5};check(mp::begin(o),"begin");}
void rules(unsigned held){mp::pilots[0].input.held=held;mp::tickRules();}
void powerItems(unsigned count) {
  begin(count);
  for (unsigned s=0;s<count;++s) {
    auto& p=mp::pilots[s];p.px=int(s)*100*128;p.py=300*128;p.playerState=1;
  }
  auto& resources=mp::pilots[0].resources;
  const auto collect=[&](int type,int power,int bucket=0) {
    itemManager.reset();resources.power=power;
    for(unsigned s=1;s<count;++s)mp::pilots[s].resources.power=400;
    item_system::SpawnRequest request;request.type=type;request.position={0,300};request.speed=0;
    request.bucketA=bucket;
    auto* item=itemManager.spawn(request);check(item!=nullptr,"spawn power test item");
    item->recipient=0;
    tickItems(false);
    check(!item->active(),"world actually collects power item");
  };
  collect(1,100);check(resources.power==100+int(count),"small P awards 0.02/0.03");
  const int rank=resources.rank;
  collect(1,199);check(resources.power==199+int(count)&&resources.rank==rank+12,"small P crosses power tier once");
  collect(1,399);check(resources.power==400,"small P clamps at max power");
  const int score=resources.scoreStored;
  collect(1,400);check(resources.power==400&&resources.scoreStored==score+1,"full power retains original small P score");
  collect(3,100);check(resources.power==200,"large P still awards one tier");
  collect(8,100);check(resources.power==400,"full power item retains original award");
  collect(16,100,4);check(resources.power==100+4*int(count),"UFO aggregate values each small P consistently");
  mp::pilots[count-1].ghost=true;
  collect(1,100);check(resources.power==100+int(count),"small P value uses room seats even with a ghost");
  itemManager.reset();
  Enemy enemy;enemy.x=12;enemy.y=120;enemy.drop=1;enemy.dropCounts[0]=2;enemy.dropCounts[2]=2;
  const auto calls=th12::random.calls;
  dropItems(enemy);
  int small=0,large=0;
  for(const auto& item:itemManager.entities)if(item.active()){small+=item.type==1;large+=item.type==3;}
  check(small==3&&large==2&&itemManager.activeCount()==5,"enemy P drop counts do not multiply by room seats");
  // One initial angle and two floats per counted drop; each float draws two words.
  check(th12::random.calls-calls==18,"enemy drops preserve original RNG draw count");
}
int main(){
  powerItems(2);powerItems(3);
  mp::Options o;check(o.valid(),"options");o.count=1;check(!o.valid(),"reject single player");
  begin();check(mp::pilots[0].character==0&&mp::pilots[1].character==1&&mp::pilots[2].character==2,"six loadouts");
  check(mp::pilots[0].px<mp::pilots[1].px&&mp::pilots[1].px<mp::pilots[2].px,"separate spawn positions");
  mp::pilots[0].resources.power=400;mp::pilots[1].resources.power=100;mp::pilots[2].resources.power=300;
  mp::pilots[0].px=0;mp::pilots[1].px=1280;mp::pilots[2].px=2560;
  for(auto& p:mp::pilots){p.py=64*128;p.playerState=1;p.invuln=0;}
  item_system::Entity item;item.type=1;item.position={0,64};item.state=item_system::State::Falling;
  item_system::PlayerView view;mp::itemPlayer(item,view);
  check(item.recipient==1,"full-power collector redirects to nearest needy seat");
  for(int i=0;i<5;++i){rules(1);rules(0);}
  check(mp::pilots[0].resources.power==300,"five taps donate exactly one power tier");
  auto gift=std::find_if(itemManager.entities.begin(),itemManager.entities.end(),[](const auto& e){return e.gift;});
  check(gift!=itemManager.entities.end()&&gift->type==3&&gift->recipient==1,"gift targets lowest relative power");
  {mp::Scope seat(1);mp::pilots[1].resources.lives=-1;mp::becameGhost();}
  for(int i=0;i<4;++i){
    rules(8);rules(8);rules(0);
    check(mp::pilots[1].ghost&&mp::pilots[0].resources.lives==2,
          "four Shift taps and held frames cannot donate a life");
  }
  rules(8);
  check(!mp::pilots[1].ghost&&mp::pilots[0].resources.lives==1,"rescue consumes donor life");
  rules(8);rules(0);
  check(mp::pilots[0].resources.lives==1,"holding fifth Shift tap cannot donate again");
  check(mp::deathbombFrames()==16,"double deathbomb window");
  Enemy boss;boss.id=101;boss.boss=true;int damage=0;for(int i=0;i<12;++i)damage+=mp::bossDamage(boss,1);
  check(damage==8,"three-player boss damage uses fractional remainder");
  ufoManager.inventory.append(1);ufoManager.inventory.append(2);
  {mp::Scope seat(2);mp::becameGhost();}
  check(ufoManager.inventory.count==2&&ufoManager.inventory.colors[0]==1&&ufoManager.inventory.colors[1]==2,"death preserves shared UFO inventory");
  mp::collectSharedPiece(4);mp::collectSharedPiece(4);mp::collectSharedPiece(4);mp::collectSharedPiece(4);
  check(mp::lifeFragments==0&&mp::pilots[0].resources.lives==2&&mp::pilots[1].resources.lives==1,"shared life fragments");
  mp::WorldState saved;const auto before=mp::canonicalHash();std::array<mp::Input,3> input{};
  input[0].held=64;input[1].held=128;input[2].held=8;
  for(int i=0;i<120;++i)check(mp::update(input),"world tick");
  const auto after=mp::canonicalHash();const auto seed=th12::random.seed;const auto calls=th12::random.calls;
  saved.restore();check(mp::canonicalHash()==before,"world snapshot restores all seats and inventory");
  for(int i=0;i<120;++i)check(mp::update(input),"resimulation");
  check(mp::canonicalHash()==after&&th12::random.seed==seed&&th12::random.calls==calls,"resimulation RNG/hash");
  const auto seatHash=mp::canonicalHash();mp::options.local=2;check(mp::canonicalHash()==seatHash,"hash independent of local seat");
  input={};input[0].pause=true;check(mp::update(input)&&mp::paused,"shared pause");
  input={};check(mp::update(input),"release pause");input[0].held=32;check(mp::update(input)&&mp::menuSelection==1,"pause navigation");
  input={};check(mp::update(input),"release navigation");input[0].held=mp::InputLanes::Confirm;
  check(mp::update(input)&&mp::menuConfirm&&mp::menuSelection==1&&!mp::finished,"original Yes/No defaults to No");
  mp::WorldState menuCheckpoint;const auto menuHash=mp::canonicalHash();
  input={};check(mp::update(input),"release confirm");input[0].held=mp::InputLanes::Confirm;
  check(mp::update(input)&&!mp::menuConfirm&&!mp::finished,"No returns to pause without retiring a peer");
  menuCheckpoint.restore();check(mp::canonicalHash()==menuHash&&mp::menuConfirm,"confirmation rollback state");
  input={};input[0].held=2;check(mp::update(input)&&!mp::menuConfirm,"Bomb cancels confirmation");
  input={};check(mp::update(input),"release cancel");input[0].pause=true;check(mp::update(input)&&!mp::paused,"Escape resumes shared world");
  input={};input[0].held=mp::InputLanes::Restart;check(mp::update(input)&&mp::restartRequested&&mp::finished,"restart is a synchronized exact input");
  begin();auto initial=mp::canonicalHash();mp::StageEntry entry;
  check(mp::decodeStageEntry(mp::encodeStageEntry(),entry),"stage entry schema");
  check(mp::restoreStageEntry(entry)&&mp::canonicalHash()==initial,"initial checkpoint reconstruction");
  ufoManager.inventory.append(3);mp::pilots[1].resources.power=278;
  fullGameFlow.carry=captureSessionCarry();fullGameFlow.status=FullGameStatus::NextStage;fullGameFlow.nextStage=2;
  selectStage(2);check(startNextStage(),"stage transition");
  initial=mp::canonicalHash();check(mp::decodeStageEntry(mp::encodeStageEntry(),entry)&&mp::restoreStageEntry(entry),"next-stage schema");
  check(mp::canonicalHash()==initial&&mp::pilots[1].resources.power==278&&ufoManager.inventory.count==1,"cross-stage resources and RNG reconstruction");
  Netplay::FrameInput wire;check(mp::InputLanes::Capture(1,true,2,-184,432,wire),"touch capture");
  std::array<Netplay::FrameInput,3> frames{wire,{}, {}};std::array<mp::Input,3> decoded;
  check(mp::InputLanes::Decode(frames.data(),3,decoded)&&decoded[0].pause&&decoded[0].x==-23552&&decoded[0].y==55296,"touch input roundtrip");
  check(mp::InputLanes::Capture(mp::InputLanes::Confirm|mp::InputLanes::Restart,false,0,0,0,wire),"menu wire lanes");
  frames[0]=wire;check(mp::InputLanes::Decode(frames.data(),3,decoded)&&decoded[0].held==(mp::InputLanes::Confirm|mp::InputLanes::Restart),"Enter/Retry wire roundtrip");
  mp::SessionSetup setup;setup.session_id=123;setup.automatic=false;setup.selections={0,3,5};setup.player_count=3;setup.build={1,2,3,4};
  mp::ReplayArchive replay;check(replay.Begin(setup,12345)&&replay.Append(0,1,frames.data(),3),"confirmed Replay append");
  std::vector<uint8_t> bytes;check(replay.Encode(bytes,"PLAYER",123,false),"Replay encode");mp::ReplayArchive loaded;
  check(loaded.Load(bytes.data(),bytes.size())&&loaded.FrameCount()==1&&(*loaded.FrameAt(0))[0]==wire,"Replay input roundtrip");
  bytes.back()^=1;check(!mp::ReplayArchive::Validate(bytes.data(),bytes.size()),"Replay corruption rejected");
  std::puts("TH12 multiplayer: resources, UFO inventory, transfers, rescue, boss damage, rollback/RNG, stage checkpoints, input and Replay passed");
}
