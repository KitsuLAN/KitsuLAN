package grpc_transport

import (
	"context"

	pb "github.com/KitsuLAN/KitsuLAN/services/core/gen/go/kitsulan/v1"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/middleware"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/service"
	domainerr "github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type GuildServer struct {
	pb.UnimplementedGuildServiceServer
	svc *service.GuildService
}

func NewGuildServer(svc *service.GuildService) *GuildServer {
	return &GuildServer{svc: svc}
}

func (s *GuildServer) CreateGuild(ctx context.Context, req *pb.CreateGuildRequest) (*pb.CreateGuildResponse, error) {
	callerID := middleware.MustUserID(ctx)
	guild, err := s.svc.CreateGuild(ctx, callerID, req.Name, req.Description)
	if err != nil {
		return nil, domainerr.ToGRPC(err)
	}
	return &pb.CreateGuildResponse{Guild: guildToProto(guild, 1)}, nil
}

func (s *GuildServer) GetGuild(ctx context.Context, req *pb.GetGuildRequest) (*pb.GetGuildResponse, error) {
	callerID := middleware.MustUserID(ctx)
	guild, err := s.svc.GetGuild(ctx, req.GuildId, callerID)
	if err != nil {
		return nil, domainerr.ToGRPC(err)
	}
	return &pb.GetGuildResponse{Guild: guildToProto(guild, 0)}, nil
}

func (s *GuildServer) ListMyGuilds(ctx context.Context, _ *pb.ListMyGuildsRequest) (*pb.ListMyGuildsResponse, error) {
	callerID := middleware.MustUserID(ctx)
	guilds, err := s.svc.ListMyGuilds(ctx, callerID)
	if err != nil {
		return nil, domainerr.ToGRPC(err)
	}
	resp := &pb.ListMyGuildsResponse{}
	for i := range guilds {
		resp.Guilds = append(resp.Guilds, guildToProto(&guilds[i], 0))
	}
	return resp, nil
}

func (s *GuildServer) DeleteGuild(ctx context.Context, req *pb.DeleteGuildRequest) (*pb.DeleteGuildResponse, error) {
	callerID := middleware.MustUserID(ctx)
	return &pb.DeleteGuildResponse{}, domainerr.ToGRPC(s.svc.DeleteGuild(ctx, req.GuildId, callerID))
}

func (s *GuildServer) CreateInvite(ctx context.Context, req *pb.CreateInviteRequest) (*pb.CreateInviteResponse, error) {
	callerID := middleware.MustUserID(ctx)
	inv, err := s.svc.CreateInvite(ctx, req.GuildId, callerID, int(req.MaxUses), int(req.ExpiresInHours))
	if err != nil {
		return nil, domainerr.ToGRPC(err)
	}
	return &pb.CreateInviteResponse{
		Code: inv.Code,
		Url:  "kitsulan://join/" + inv.Code,
	}, nil
}

func (s *GuildServer) JoinByInvite(ctx context.Context, req *pb.JoinByInviteRequest) (*pb.JoinByInviteResponse, error) {
	callerID := middleware.MustUserID(ctx)
	guild, err := s.svc.JoinByInvite(ctx, req.Code, callerID)
	if err != nil {
		return nil, domainerr.ToGRPC(err)
	}
	return &pb.JoinByInviteResponse{Guild: guildToProto(guild, 0)}, nil
}

func (s *GuildServer) LeaveGuild(ctx context.Context, req *pb.LeaveGuildRequest) (*pb.LeaveGuildResponse, error) {
	callerID := middleware.MustUserID(ctx)
	return &pb.LeaveGuildResponse{}, domainerr.ToGRPC(s.svc.LeaveGuild(ctx, req.GuildId, callerID))
}

func (s *GuildServer) CreateChannel(ctx context.Context, req *pb.CreateChannelRequest) (*pb.CreateChannelResponse, error) {
	callerID := middleware.MustUserID(ctx)
	chType := protoToChannelType(req.Type)
	ch, err := s.svc.CreateChannel(ctx, req.GuildId, callerID, req.Name, chType)
	if err != nil {
		return nil, domainerr.ToGRPC(err)
	}
	return &pb.CreateChannelResponse{Channel: channelToProto(ch)}, nil
}

func (s *GuildServer) DeleteChannel(ctx context.Context, req *pb.DeleteChannelRequest) (*pb.DeleteChannelResponse, error) {
	callerID := middleware.MustUserID(ctx)
	return &pb.DeleteChannelResponse{}, domainerr.ToGRPC(s.svc.DeleteChannel(ctx, req.ChannelId, callerID))
}

func (s *GuildServer) ListChannels(ctx context.Context, req *pb.ListChannelsRequest) (*pb.ListChannelsResponse, error) {
	callerID := middleware.MustUserID(ctx)
	channels, err := s.svc.ListChannels(ctx, req.GuildId, callerID)
	if err != nil {
		return nil, domainerr.ToGRPC(err)
	}
	resp := &pb.ListChannelsResponse{}
	for i := range channels {
		resp.Channels = append(resp.Channels, channelToProto(&channels[i]))
	}
	return resp, nil
}

func (s *GuildServer) ListMembers(ctx context.Context, req *pb.ListMembersRequest) (*pb.ListMembersResponse, error) {
	callerID := middleware.MustUserID(ctx)
	members, err := s.svc.ListMembers(ctx, req.GuildId, callerID)
	if err != nil {
		return nil, domainerr.ToGRPC(err)
	}
	resp := &pb.ListMembersResponse{}
	for _, m := range members {
		resp.Members = append(resp.Members, &pb.Member{
			UserId:    m.UserID.String(),
			Username:  m.User.Username,
			AvatarUrl: m.User.AvatarURL,
			Nickname:  m.Nickname,
			JoinedAt:  timestamppb.New(m.JoinedAt),
		})
	}
	return resp, nil
}

// --- converters ---

func guildToProto(g *domain.Guild, memberCount int32) *pb.Guild {
	return &pb.Guild{
		Id:          g.ID.String(),
		Name:        g.Name,
		Description: g.Description,
		IconUrl:     g.IconURL,
		OwnerId:     g.OwnerID.String(),
		MemberCount: memberCount,
		CreatedAt:   timestamppb.New(g.CreatedAt),
	}
}

func channelToProto(ch *domain.Channel) *pb.Channel {
	return &pb.Channel{
		Id:       ch.ID.String(),
		GuildId:  ch.GuildID.String(),
		Name:     ch.Name,
		Type:     channelTypeToProto(ch.Type),
		Position: int32(ch.Position),
	}
}

func channelTypeToProto(t domain.ChannelType) pb.ChannelType {
	if t == domain.ChannelTypeVoice {
		return pb.ChannelType_CHANNEL_TYPE_VOICE
	}
	return pb.ChannelType_CHANNEL_TYPE_TEXT
}

func protoToChannelType(t pb.ChannelType) domain.ChannelType {
	if t == pb.ChannelType_CHANNEL_TYPE_VOICE {
		return domain.ChannelTypeVoice
	}
	return domain.ChannelTypeText
}
